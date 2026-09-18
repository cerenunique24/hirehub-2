"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchSubscriptionStatus, type SubscriptionStatus } from "@/lib/premium";

export function usePremium() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) {
          setStatus({ plan: "free", status: "active", expires_at: null, trial_used: false });
          setLoading(false);
        }
        return;
      }

      const result = await fetchSubscriptionStatus(supabase);
      if (active) {
        setStatus(result);
        setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [supabase]);

  return {
    isPremium: status?.plan === "premium",
    status,
    loading,
  };
}
