import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    console.log(`Calling nhhtool API: ${action}, URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    // Get raw text first to handle empty or non-JSON responses
    const rawText = await response.text();
    console.log(`nhhtool API raw response for ${action}:`, rawText);

    // Check if response is empty
    if (!rawText || rawText.trim() === '') {
      console.error('Empty response from nhhtool API');
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          message: 'Empty response from API' 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError, 'Raw:', rawText);
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          message: 'Invalid JSON response from API',
          raw: rawText.substring(0, 200)
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`nhhtool API parsed response for ${action}:`, JSON.stringify(data));

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
