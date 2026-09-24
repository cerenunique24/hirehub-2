import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ekip (coalition) mesajlaşması — bağımsız bir chat sistemi değil, mevcut
 * `messages` tablosunun coalition_id alanı üzerinden grup yayını (broadcast)
 * olarak kullanılması. 1:1 client-freelancer mesajlaşması (receiver_id) bu
 * fonksiyonlardan etkilenmez/değişmez.
 *
 * RLS (bkz. supabase/migrations/202609240002_team_coalition_and_messaging.sql)
 * bu sorguları zaten sadece coalition_members (active) veya projenin client'ı
 * ile sınırlıyor — burada ayrıca bir yetki kontrolü yapmıyoruz.
 */

export type TeamMessage = {
  id: string;
  coalition_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
};

export async function getTeamMessages(
  supabase: SupabaseClient,
  coalitionId: string
): Promise<{ data: TeamMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, coalition_id, sender_id, content, created_at")
    .eq("coalition_id", coalitionId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as TeamMessage[], error: null };
}

export async function sendTeamMessage(
  supabase: SupabaseClient,
  coalitionId: string,
  senderId: string,
  content: string
): Promise<{ error: string | null }> {
  const trimmed = content.trim();

  if (!trimmed) {
    return { error: "Mesaj boş olamaz." };
  }

  const { error } = await supabase.from("messages").insert({
    coalition_id: coalitionId,
    sender_id: senderId,
    receiver_id: null,
    content: trimmed,
  });

  return { error: error?.message ?? null };
}
