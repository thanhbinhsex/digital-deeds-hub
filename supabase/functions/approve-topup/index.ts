import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ApproveTopupRequest {
  topupId: string;
  action: "approve" | "deny";
  adminNote?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminId = claimsData.user.id;

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .single();

    if (roleError || roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { topupId, action, adminNote } = await req.json() as ApproveTopupRequest;

    if (!topupId || !action) {
      return new Response(
        JSON.stringify({ error: "Missing topupId or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action !== "approve" && action !== "deny") {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be 'approve' or 'deny'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get topup request
    const { data: topup, error: topupError } = await supabaseAdmin
      .from("topup_requests")
      .select("*")
      .eq("id", topupId)
      .single();

    if (topupError || !topup) {
      return new Response(
        JSON.stringify({ error: "Topup request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already processed (idempotency)
    if (topup.status !== "pending") {
      return new Response(
        JSON.stringify({ 
          error: "Topup request already processed",
          status: topup.status 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();

    if (action === "deny") {
      // Just update status to denied
      const { error: updateError } = await supabaseAdmin
        .from("topup_requests")
        .update({
          status: "denied",
          admin_id: adminId,
          admin_note: adminNote || null,
          decided_at: now,
        })
        .eq("id", topupId);

      if (updateError) {
        throw updateError;
      }

      // Log audit
      await supabaseAdmin.from("admin_audit_logs").insert({
        admin_id: adminId,
        action: "DENY_TOPUP",
        entity_type: "topup_request",
        entity_id: topupId,
        before_data: { status: "pending" },
        after_data: { status: "denied", admin_note: adminNote },
      });

      return new Response(
        JSON.stringify({ success: true, message: "Topup request denied" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // APPROVE flow
    // 1. Get current wallet balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", topup.user_id)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ error: "User wallet not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + topup.amount;

    // 2. Create wallet transaction (immutable ledger)
    const { error: txError } = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        user_id: topup.user_id,
        type: "credit",
        amount: topup.amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        ref_type: "topup",
        ref_id: topupId,
        note: `Top-up via ${topup.method}. Ref: ${topup.reference}`,
      });

    if (txError) {
      throw txError;
    }

    // 3. Update wallet balance
    const { error: walletUpdateError } = await supabaseAdmin
      .from("wallets")
      .update({ balance: balanceAfter, updated_at: now })
      .eq("user_id", topup.user_id);

    if (walletUpdateError) {
      throw walletUpdateError;
    }

    // 4. Update topup request status
    const { error: topupUpdateError } = await supabaseAdmin
      .from("topup_requests")
      .update({
        status: "approved",
        admin_id: adminId,
        admin_note: adminNote || null,
        decided_at: now,
      })
      .eq("id", topupId);

    if (topupUpdateError) {
      throw topupUpdateError;
    }

    // 5. Log audit
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: adminId,
      action: "APPROVE_TOPUP",
      entity_type: "topup_request",
      entity_id: topupId,
      before_data: { status: "pending", wallet_balance: balanceBefore },
      after_data: { status: "approved", wallet_balance: balanceAfter, admin_note: adminNote },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Topup approved successfully",
        data: {
          topupId,
          amount: topup.amount,
          balanceBefore,
          balanceAfter,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing topup:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
