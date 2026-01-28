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

// Escape special characters for Telegram HTML mode
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
    const formattedAmount = data.amount.toLocaleString('vi-VN');

    if (type === 'order') {
      const itemsList = data.items?.join(', ') || 'N/A';
      message = `🛒 <b>ĐƠN HÀNG MỚI</b>\n\n` +
        `📋 Mã đơn: <code>${escapeHtml(data.id.slice(0, 8))}...</code>\n` +
        `👤 Email: ${escapeHtml(data.userEmail || 'N/A')}\n` +
        `💰 Tổng tiền: ${formattedAmount} VND\n` +
        `📦 Sản phẩm: ${escapeHtml(itemsList)}\n` +
        `🕐 Thời gian: ${timestamp}`;
    } else if (type === 'topup') {
      message = `💳 <b>YÊU CẦU NẠP TIỀN</b>\n\n` +
        `📋 Mã yêu cầu: <code>${escapeHtml(data.id.slice(0, 8))}...</code>\n` +
        `👤 Email: ${escapeHtml(data.userEmail || 'N/A')}\n` +
        `💰 Số tiền: ${formattedAmount} VND\n` +
        `🔑 Mã nạp: <code>${escapeHtml(data.topupCode || 'N/A')}</code>\n` +
        `🏦 Phương thức: ${escapeHtml(data.method || 'N/A')}\n` +
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
        parse_mode: 'HTML',
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
