import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create user client to verify auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Parse request body
    const { topupId } = await req.json();
    if (!topupId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing topupId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the topup request and verify ownership
    const { data: topup, error: topupError } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('id', topupId)
      .eq('user_id', userId)
      .single();

    if (topupError || !topup) {
      return new Response(
        JSON.stringify({ success: false, error: 'Topup request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (topup.status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Topup already processed',
          status: topup.status 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!topup.topup_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Topup code not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch bank transactions
    const BANK_API_TOKEN = Deno.env.get('BANK_API_TOKEN');
    if (!BANK_API_TOKEN) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bank API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bankResponse = await fetch(`https://thueapibank.vn/historyapivcbv2/${BANK_API_TOKEN}`);
    if (!bankResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch bank transactions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bankData: BankApiResponse = await bankResponse.json();
    
    if (bankData.status !== 'success') {
      return new Response(
        JSON.stringify({ success: false, error: 'Bank API error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying topup ${topupId} with code ${topup.topup_code}`);
    console.log(`Fetched ${bankData.transactions?.length || 0} bank transactions`);

    // Look for matching transaction
    const matchingTx = bankData.transactions?.find((tx) => {
      const descUpper = tx.description.toUpperCase();
      const codeUpper = topup.topup_code?.toUpperCase() || '';
      
      return (
        tx.type === 'IN' &&
        descUpper.includes(codeUpper) &&
        tx.amount >= topup.amount
      );
    });

    if (!matchingTx) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Transaction not found',
          message: 'Không tìm thấy giao dịch phù hợp. Vui lòng kiểm tra lại nội dung chuyển khoản hoặc đợi vài phút rồi thử lại.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Match found: Transaction ${matchingTx.transactionID}`);

    // Check if this transaction was already used
    const { data: existingTx } = await supabase
      .from('topup_requests')
      .select('id')
      .eq('bank_transaction_id', matchingTx.transactionID)
      .maybeSingle();

    if (existingTx) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Transaction already used',
          message: 'Giao dịch này đã được sử dụng cho một yêu cầu nạp tiền khác.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + topup.amount;

    // Create wallet transaction
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'credit',
        amount: topup.amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        ref_type: 'topup',
        ref_id: topupId,
        note: `Auto-verified bank transfer. Transaction: ${matchingTx.transactionID}`,
      });

    if (txError) {
      throw txError;
    }

    // Update wallet balance
    const { error: walletUpdateError } = await supabase
      .from('wallets')
      .update({ balance: balanceAfter, updated_at: now })
      .eq('user_id', userId);

    if (walletUpdateError) {
      throw walletUpdateError;
    }

    // Update topup request
    const { error: topupUpdateError } = await supabase
      .from('topup_requests')
      .update({
        status: 'approved',
        admin_note: `Auto-verified. Transaction: ${matchingTx.transactionID}, Amount: ${matchingTx.amount.toLocaleString('vi-VN')} VND`,
        bank_transaction_id: matchingTx.transactionID,
        decided_at: now,
      })
      .eq('id', topupId);

    if (topupUpdateError) {
      throw topupUpdateError;
    }

    console.log(`Topup ${topupId} approved. Balance: ${balanceBefore} -> ${balanceAfter}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Nạp tiền thành công!',
        data: {
          amount: topup.amount,
          balanceBefore,
          balanceAfter,
          transactionId: matchingTx.transactionID,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying topup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
