import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NHHTOOL_API_BASE = 'https://api.nhhtool.id.vn/api';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('NHHTOOL_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('NHHTOOL_ACCESS_TOKEN is not configured');
    }

    const { action, tool_id, key, transaction_code } = await req.json();

    let url = '';
    
    switch (action) {
      case 'userinfo':
        url = `${NHHTOOL_API_BASE}/userinfo.php?access_token=${accessToken}`;
        break;
      case 'buytool':
        if (!tool_id) {
          throw new Error('tool_id is required for buytool action');
        }
        url = `${NHHTOOL_API_BASE}/buytool.php?access_token=${accessToken}&tool_id=${tool_id}`;
        break;
      case 'activekey':
        if (!key) {
          throw new Error('key is required for activekey action');
        }
        url = `${NHHTOOL_API_BASE}/activekey.php?access_token=${accessToken}&key=${encodeURIComponent(key)}`;
        break;
      case 'history':
        url = `${NHHTOOL_API_BASE}/history.php?access_token=${accessToken}`;
        if (transaction_code) {
          url += `&transaction_code=${encodeURIComponent(transaction_code)}`;
        }
        break;
      default:
        throw new Error('Invalid action. Must be one of: userinfo, buytool, activekey, history');
    }

    console.log(`Calling nhhtool API: ${action}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();
    console.log(`nhhtool API response for ${action}:`, JSON.stringify(data));

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error calling nhhtool API:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
