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

    const response = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`
    );

    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const data = await response.json();
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
        rate,
        date: data.date,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch exchange rate',
        // Fallback rate
        from: 'USD',
        to: 'VND',
        rate: 25000,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
