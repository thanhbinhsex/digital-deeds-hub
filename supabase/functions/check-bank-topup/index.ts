import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BankTransaction {
  transactionID: string;
  amount: number;
  description: string;
  transactionDate: string;
  type: string;
}

interface BankApiResponse {
  status: string;
  message: string;
  transactions: BankTransaction[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BANK_API_TOKEN = Deno.env.get('BANK_API_TOKEN');
    if (!BANK_API_TOKEN) {
      throw new Error('BANK_API_TOKEN not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch bank transactions
    const bankResponse = await fetch(`https://thueapibank.vn/historyapivcbv2/${BANK_API_TOKEN}`);
    if (!bankResponse.ok) {
      throw new Error(`Bank API error: ${bankResponse.status}`);
    }

    const bankData: BankApiResponse = await bankResponse.json();
    
    if (bankData.status !== 'success') {
      throw new Error(`Bank API returned: ${bankData.message}`);
    }

    console.log(`Fetched ${bankData.transactions?.length || 0} bank transactions`);

    // Get all pending topup requests
    const { data: pendingTopups, error: fetchError } = await supabase
      .from('topup_requests')
      .select('id, user_id, amount, topup_code')
      .eq('status', 'pending')
      .not('topup_code', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch pending topups: ${fetchError.message}`);
    }

    console.log(`Found ${pendingTopups?.length || 0} pending topups`);

    let approvedCount = 0;
    const results: Array<{ topupId: string; matched: boolean; transactionId?: string }> = [];

    // Match transactions with pending topups
    for (const topup of pendingTopups || []) {
      // Look for transaction that contains the topup code in description
      // and has matching or greater amount, and is type "IN"
      const matchingTx = bankData.transactions?.find((tx) => {
        const descUpper = tx.description.toUpperCase();
        const codeUpper = topup.topup_code?.toUpperCase() || '';
        
        return (
          tx.type === 'IN' &&
          descUpper.includes(codeUpper) &&
          tx.amount >= topup.amount
        );
      });

      if (matchingTx) {
        console.log(`Match found: Topup ${topup.id} (${topup.topup_code}) -> Transaction ${matchingTx.transactionID}`);

        // Check if this transaction was already used
        const { data: existingTx } = await supabase
          .from('topup_requests')
          .select('id')
          .eq('bank_transaction_id', matchingTx.transactionID)
          .maybeSingle();

        if (existingTx) {
          console.log(`Transaction ${matchingTx.transactionID} already used for topup ${existingTx.id}`);
          results.push({ topupId: topup.id, matched: false });
          continue;
        }

        // Call approve-topup function
        const { error: approveError } = await supabase.functions.invoke('approve-topup', {
          body: {
            topupId: topup.id,
            action: 'approve',
            adminNote: `Auto-approved via bank transfer. Transaction: ${matchingTx.transactionID}, Amount: ${matchingTx.amount.toLocaleString('vi-VN')} VND`,
          },
        });

        if (approveError) {
          console.error(`Failed to approve topup ${topup.id}:`, approveError);
          results.push({ topupId: topup.id, matched: false });
          continue;
        }

        // Update bank_transaction_id to prevent duplicate matching
        await supabase
          .from('topup_requests')
          .update({ bank_transaction_id: matchingTx.transactionID })
          .eq('id', topup.id);

        approvedCount++;
        results.push({ topupId: topup.id, matched: true, transactionId: matchingTx.transactionID });
      } else {
        results.push({ topupId: topup.id, matched: false });
      }
    }

    console.log(`Auto-approved ${approvedCount} topups`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${pendingTopups?.length || 0} pending topups, auto-approved ${approvedCount}`,
        results,
        bankTransactionsCount: bankData.transactions?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking bank topups:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
