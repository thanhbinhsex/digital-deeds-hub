const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { from = 'USD', to = 'VND' } = await req.json().catch(() => ({}));

    console.log(`Fetching exchange rate: ${from} -> ${to}`);

    // Try free ExchangeRate-API (supports VND, no API key needed)
    const response = await fetch(
      `https://open.er-api.com/v6/latest/${from}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result !== 'success') {
      throw new Error('API returned error');
    }

    const rate = data.rates?.[to];

    if (!rate) {
      throw new Error(`Rate not found for ${to}`);
    }

    console.log(`Exchange rate: 1 ${from} = ${rate} ${to}`);

    return new Response(
      JSON.stringify({
        success: true,
        from,
        to,
        rate: Math.round(rate),
        date: data.time_last_update_utc?.split(' ')[0] || new Date().toISOString().split('T')[0],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    
    // Fallback to reasonable static rate
    const fallbackRate = 25500;
    console.log(`Using fallback rate: ${fallbackRate}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        from: 'USD',
        to: 'VND',
        rate: fallbackRate,
        date: new Date().toISOString().split('T')[0],
        fallback: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
