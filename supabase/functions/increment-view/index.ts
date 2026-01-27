import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id } = await req.json();

    if (!product_id) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Increment view count
    const { data, error } = await supabase.rpc('increment_product_view', {
      p_product_id: product_id
    });

    if (error) {
      // Fallback: direct update if RPC doesn't exist
      const { error: updateError } = await supabase
        .from('products')
        .update({ view_count: supabase.rpc('increment_view_count_fallback') })
        .eq('id', product_id);
      
      // Simple increment
      const { data: product } = await supabase
        .from('products')
        .select('view_count')
        .eq('id', product_id)
        .single();
      
      if (product) {
        await supabase
          .from('products')
          .update({ view_count: (product.view_count || 0) + 1 })
          .eq('id', product_id);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error incrementing view:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to increment view' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
