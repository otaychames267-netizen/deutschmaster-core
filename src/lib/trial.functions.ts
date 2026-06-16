import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TRIAL_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export const ensureUserTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: existingSubscription, error: existingError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (existingSubscription) {
      return { subscription: existingSubscription, created: false, reason: "existing_subscription" };
    }

    const { data: account, error: accountError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (accountError || !account.user?.email) {
      throw new Error("Could not verify the account for trial activation.");
    }

    const email = account.user.email.toLowerCase();
    const { data: previousClaims, error: claimLookupError } = await supabaseAdmin
      .from("trial_claims")
      .select("id,user_id")
      .ilike("email", email)
      .neq("user_id", userId)
      .limit(1);

    if (claimLookupError) throw new Error(claimLookupError.message);
    if (previousClaims && previousClaims.length > 0) {
      return { subscription: null, created: false, reason: "trial_already_used" };
    }

    const { error: claimError } = await supabaseAdmin
      .from("trial_claims")
      .upsert({ user_id: userId, email }, { onConflict: "user_id" });

    if (claimError) throw new Error(claimError.message);

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + TRIAL_DAYS * DAY_MS);
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_code: "premium",
        status: "trial",
        is_trial: true,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("*")
      .single();

    if (subscriptionError) throw new Error(subscriptionError.message);

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Free trial active",
      body: "Your 3-day free trial is now active. Start with Schriftlich or Mündlich from your dashboard.",
      type: "trial",
    });

    return { subscription, created: true, reason: "trial_created" };
  });