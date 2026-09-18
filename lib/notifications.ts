import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tek, paylaşılan notification-insert helper'ı. Milestone akışı
 * (lib/projects/milestones.ts) ve proposal/invitation/project-start
 * akışları aynı fonksiyonu kullanır — notifications tablosuna
 * yazan tek yer burasıdır.
 */
export async function notifyUsers(
  supabase: SupabaseClient,
  notifications: Array<{
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
  }>
) {
  if (notifications.length === 0) return { error: null };

  const { error } = await supabase.from("notifications").insert(
    notifications.map((n) => ({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link ?? null,
    }))
  );

  return { error };
}
