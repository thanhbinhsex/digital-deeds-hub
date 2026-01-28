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

    // Fetch topup promotion settings
    const { data: promoSettings } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'topup_promotion')
      .single();

    // Calculate bonus
    let bonusPercent = 0;
    let bonusAmount = 0;
    const promos = promoSettings?.value?.promotions || [];
    
    // Find matching promotion (highest threshold that applies)
    for (const promo of promos) {
      if (promo.enabled && topup.amount >= promo.min_amount) {
        bonusPercent = promo.bonus_percent;
      }
    }
    
    if (bonusPercent > 0) {
      bonusAmount = Math.floor(topup.amount * bonusPercent / 100);
    }

    const totalCredit = topup.amount + bonusAmount;

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
    const balanceAfter = balanceBefore + totalCredit;

    // Create wallet transaction
    const bonusNote = bonusAmount > 0 
      ? ` (+${bonusPercent}% bonus: ${bonusAmount.toLocaleString('vi-VN')} VND)`
      : '';
    
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'credit',
        amount: totalCredit,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        ref_type: 'topup',
        ref_id: topupId,
        note: `Auto-verified bank transfer. Transaction: ${matchingTx.transactionID}${bonusNote}`,
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

    // Update topup request with bonus info
    const adminNote = bonusAmount > 0
      ? `Auto-verified. Transaction: ${matchingTx.transactionID}, Amount: ${matchingTx.amount.toLocaleString('vi-VN')} VND, Bonus: +${bonusPercent}% (${bonusAmount.toLocaleString('vi-VN')} VND)`
      : `Auto-verified. Transaction: ${matchingTx.transactionID}, Amount: ${matchingTx.amount.toLocaleString('vi-VN')} VND`;

    const { error: topupUpdateError } = await supabase
      .from('topup_requests')
      .update({
        status: 'approved',
        admin_note: adminNote,
        bank_transaction_id: matchingTx.transactionID,
        decided_at: now,
      })
      .eq('id', topupId);

    if (topupUpdateError) {
      throw topupUpdateError;
    }

    console.log(`Topup ${topupId} approved. Balance: ${balanceBefore} -> ${balanceAfter} (bonus: ${bonusAmount})`);

    // Send Telegram notification for successful topup
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      try {
        // Get user email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', userId)
          .single();
        
        const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const formattedAmount = topup.amount.toLocaleString('vi-VN');
        const formattedTotal = totalCredit.toLocaleString('vi-VN');
        
        let message = `💰 <b>NẠP TIỀN THÀNH CÔNG</b>\n\n` +
          `📋 Mã nạp: <code>${topup.topup_code}</code>\n` +
          `👤 Email: ${profile?.email || 'N/A'}\n` +
          `💵 Số tiền: ${formattedAmount} VND\n`;
        
        if (bonusAmount > 0) {
          message += `🎁 Thưởng +${bonusPercent}%: ${bonusAmount.toLocaleString('vi-VN')} VND\n`;
          message += `💰 Tổng cộng: ${formattedTotal} VND\n`;
        }
        
        message += `🕐 Thời gian: ${timestamp}`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
          }),
        });
      } catch (e) {
        console.error('Telegram notification failed:', e);
      }
    }

    const successMessage = bonusAmount > 0
      ? `Nạp tiền thành công! Bạn nhận thêm ${bonusPercent}% bonus (${bonusAmount.toLocaleString('vi-VN')} VND)`
      : 'Nạp tiền thành công!';

    return new Response(
      JSON.stringify({
        success: true,
        message: successMessage,
        data: {
          amount: topup.amount,
          bonus: bonusAmount,
          totalCredit,
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
