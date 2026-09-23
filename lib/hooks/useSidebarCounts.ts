"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type SidebarCounts = {
  unreadNotifications: number;
  unreadMessages: number;
  /**
   * Client için: kendi projelerine gelen "pending" proposals sayısı.
   * Freelancer için: kendisine gelen "pending" project_team_invitations sayısı.
   *
   * İkisi de "Teklifler" sidebar linkindeki, kullanıcının aksiyon
   * alması gereken öğe sayısını temsil eder.
   */
  pendingProposals: number;
  loading: boolean;
};

const EMPTY_COUNTS = {
  unreadNotifications: 0,
  unreadMessages: 0,
  pendingProposals: 0,
};

/**
 * Client ve freelancer sidebar'larının ortak, tek noktadan
 * hesaplanan gerçek zamanlı sayaç kaynağı.
 *
 * Hata durumunda sessizce 0'a düşer; sidebar badge'i kırılmaz,
 * sadece görünmez.
 */
export function useSidebarCounts(
  role: "client" | "freelancer"
): SidebarCounts {
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const supabase = createClient();

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setCounts(EMPTY_COUNTS);
            setLoading(false);
          }
          return;
        }

        const [notificationsResult, messagesResult] = await Promise.all([
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false),
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("receiver_id", user.id)
            .eq("is_read", false),
        ]);

        let pendingProposals = 0;

        if (role === "freelancer") {
          const { count } = await supabase
            .from("project_team_invitations")
            .select("id", { count: "exact", head: true })
            .eq("freelancer_id", user.id)
            .eq("status", "pending");

          pendingProposals = count ?? 0;
        } else {
          const { data: projectRows } = await supabase
            .from("projects")
            .select("id")
            .eq("client_id", user.id);

          const projectIds = (projectRows ?? []).map((row) => row.id);

          if (projectIds.length > 0) {
            const { count } = await supabase
              .from("proposals")
              .select("id", { count: "exact", head: true })
              .in("project_id", projectIds)
              .eq("status", "pending");

            pendingProposals = count ?? 0;
          }
        }

        if (!cancelled) {
          setCounts({
            unreadNotifications: notificationsResult.count ?? 0,
            unreadMessages: messagesResult.count ?? 0,
            pendingProposals,
          });
        }
      } catch (error) {
        console.error("Sidebar counts load error:", error);

        if (!cancelled) {
          setCounts(EMPTY_COUNTS);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [role]);

  return { ...counts, loading };
}
