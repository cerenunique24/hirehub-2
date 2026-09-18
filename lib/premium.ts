import type { SupabaseClient } from "@supabase/supabase-js";

export type SubscriptionStatus = {
  plan: "free" | "premium";
  status: "active" | "trial" | "canceled" | "expired";
  expires_at: string | null;
  trial_used: boolean;
};

/**
 * Kullanıcının gerçek Premium durumunu Supabase'ten okur (RPC:
 * my_subscription_status — expiry kontrolü DB tarafında yapılır,
 * frontend'de asla "premium mi" diye tahmin edilmez).
 */
export async function fetchSubscriptionStatus(supabase: SupabaseClient): Promise<SubscriptionStatus> {
  const { data, error } = await supabase.rpc("my_subscription_status").single();

  if (error || !data) {
    return { plan: "free", status: "active", expires_at: null, trial_used: false };
  }

  return data as SubscriptionStatus;
}

export async function startPremiumTrial(supabase: SupabaseClient) {
  return supabase.rpc("start_premium_trial").single();
}
