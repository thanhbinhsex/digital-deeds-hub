import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CartItem {
  productId: string;
  name: string;
  nameVi?: string;
  price: number;
  quantity: number;
}

interface CheckoutRequest {
  items: CartItem[];
  couponId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication using getClaims (faster, doesn't require active session)
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

    // Create client and verify JWT claims
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('Auth error:', claimsError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    // Parse request
    const { items, couponId }: CheckoutRequest = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cart is empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for secure operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify products exist and get current prices (prevent price manipulation)
    const productIds = items.map(item => item.productId);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, name_vi, price, status')
      .in('id', productIds)
      .eq('status', 'published');

    if (productsError) throw productsError;

    if (!products || products.length !== items.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'Some products are unavailable' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Calculate total from SERVER-SIDE prices (not client prices)
    let totalAmount = 0;
    const verifiedItems = items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      
      const itemTotal = product.price * (item.quantity || 1);
      totalAmount += itemTotal;
      
      return {
        productId: item.productId,
        name: product.name,
        nameVi: product.name_vi,
        price: product.price, // Use server price, not client price
        quantity: item.quantity || 1,
      };
    });

    // 3. Get wallet and verify balance
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

    if (wallet.balance < totalAmount) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Insufficient balance',
          required: totalAmount,
          available: wallet.balance 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - totalAmount;

    // 4. Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status: 'paid',
        total_amount: totalAmount,
        currency: 'VND',
        payment_method: 'wallet',
        coupon_id: couponId || null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 5. Create order items
    const orderItems = verifiedItems.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.name,
      unit_price: item.price,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // 6. Create wallet transaction (DEBIT)
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'debit',
        amount: totalAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        ref_type: 'order',
        ref_id: order.id,
        note: `Purchase order #${order.id.slice(0, 8)}`,
      });

    if (txError) throw txError;

    // 7. Update wallet balance
    const { error: walletUpdateError } = await supabase
      .from('wallets')
      .update({ balance: balanceAfter, updated_at: now })
      .eq('user_id', userId);

    if (walletUpdateError) throw walletUpdateError;

    // 8. Create entitlements (skip if user already owns the product)
    const entitlements = verifiedItems.map(item => ({
      user_id: userId,
      product_id: item.productId,
      order_id: order.id,
    }));

    // Use upsert with onConflict to handle duplicates gracefully
    const { error: entitlementError } = await supabase
      .from('entitlements')
      .upsert(entitlements, { 
        onConflict: 'user_id,product_id',
        ignoreDuplicates: true 
      });

    if (entitlementError) throw entitlementError;

    // 9. Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        provider: 'wallet',
        amount: totalAmount,
        status: 'completed',
      });

    if (paymentError) throw paymentError;

    // 10. Send Telegram notification (fire and forget)
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      try {
        const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const formattedAmount = totalAmount.toLocaleString('vi-VN');
        const itemsList = verifiedItems.map(i => i.name).join(', ');

        const message = `🛒 <b>ĐƠN HÀNG MỚI</b>\n\n` +
          `📋 Mã đơn: <code>${order.id.slice(0, 8)}...</code>\n` +
          `👤 Email: ${userEmail || 'N/A'}\n` +
          `💰 Tổng tiền: ${formattedAmount} VND\n` +
          `📦 Sản phẩm: ${itemsList}\n` +
          `🕐 Thời gian: ${timestamp}`;

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

    console.log(`Order ${order.id} completed. User: ${userId}, Amount: ${totalAmount}, Balance: ${balanceBefore} -> ${balanceAfter}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          orderId: order.id,
          totalAmount,
          balanceBefore,
          balanceAfter,
          items: verifiedItems.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
