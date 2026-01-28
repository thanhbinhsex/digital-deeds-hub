import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TelegramPayload {
  type: 'order' | 'topup';
  data: {
    id: string;
    amount: number;
    userEmail?: string;
    items?: string[];
    method?: string;
    reference?: string;
    topupCode?: string;
  };
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    if (!TELEGRAM_CHAT_ID) {
      throw new Error('TELEGRAM_CHAT_ID is not configured');
    }

    const { type, data }: TelegramPayload = await req.json();

    let message = '';
    const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    if (type === 'order') {
      message = `🛒 *ĐƠN HÀNG MỚI*\n\n` +
        `📋 Mã đơn: \`${data.id.slice(0, 8)}...\`\n` +
        `👤 Email: ${data.userEmail || 'N/A'}\n` +
        `💰 Tổng tiền: ${(data.amount).toLocaleString('vi-VN')} VND\n` +
        `📦 Sản phẩm: ${data.items?.join(', ') || 'N/A'}\n` +
        `🕐 Thời gian: ${timestamp}`;
    } else if (type === 'topup') {
      message = `💳 *YÊU CẦU NẠP TIỀN*\n\n` +
        `📋 Mã yêu cầu: \`${data.id.slice(0, 8)}...\`\n` +
        `👤 Email: ${data.userEmail || 'N/A'}\n` +
        `💰 Số tiền: ${(data.amount).toLocaleString('vi-VN')} VND\n` +
        `🔑 Mã nạp: ${data.topupCode || 'N/A'}\n` +
        `🏦 Phương thức: ${data.method || 'N/A'}\n` +
        `🕐 Thời gian: ${timestamp}`;
    }

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Telegram API error [${response.status}]: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error sending Telegram notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
