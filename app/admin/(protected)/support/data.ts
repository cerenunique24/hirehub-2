import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminSupportTicketListItem = {
  id: string;
  subject: string;
  category: string | null;
  priority: string;
  status: string;
  createdAt: string;
  requesterId: string;
  requesterName: string;
};

export type AdminSupportTicketDetail = AdminSupportTicketListItem & {
  description: string;
  requesterEmail: string | null;
  requesterRole: "freelancer" | "client" | null;
  relatedProjectId: string | null;
  relatedProjectTitle: string | null;
};

export type AdminSupportTicketMessage = {
  id: string;
  senderId: string;
  senderName: string;
  isAdminSender: boolean;
  message: string;
  createdAt: string;
};

function fullNameOf(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || "İsimsiz kullanıcı";
}

export async function listAdminSupportTickets(
  supabase: SupabaseClient
): Promise<{ items: AdminSupportTicketListItem[]; error: boolean }> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, subject, category, priority, status, created_at, user_id")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[CollaCrew Admin] Destek talebi listesi alınamadı:", error);
    return { items: [], error: true };
  }

  const userIds = [...new Set(data.map((t) => t.user_id))];
  let namesById = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);

    if (profileError) {
      console.error("[CollaCrew Admin] Destek talebi sahiplerinin isimleri alınamadı:", profileError);
    }

    namesById = new Map((profileRows ?? []).map((p) => [p.id, fullNameOf(p.first_name, p.last_name)]));
  }

  return {
    items: data.map((t) => ({
      id: t.id,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      createdAt: t.created_at,
      requesterId: t.user_id,
      requesterName: namesById.get(t.user_id) ?? "Bilinmeyen kullanıcı",
    })),
    error: false,
  };
}

export async function getAdminSupportTicketDetail(
  supabase: SupabaseClient,
  id: string
): Promise<AdminSupportTicketDetail | null> {
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("id, subject, category, priority, status, description, created_at, user_id, related_project_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[CollaCrew Admin] Destek talebi detayı alınamadı:", error);
    return null;
  }

  if (!ticket) {
    return null;
  }

  // `email` authenticated rolüne kısıtlı — admin RPC'si üzerinden okunur
  // (bkz. app/admin/(protected)/users/data.ts).
  const { data: requesterRaw } = await supabase
    .rpc("admin_list_profiles")
    .eq("id", ticket.user_id)
    .maybeSingle();

  const requester = requesterRaw as unknown as
    | { first_name: string | null; last_name: string | null; email: string | null; role: string | null }
    | null;

  let relatedProjectTitle: string | null = null;
  if (ticket.related_project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("title")
      .eq("id", ticket.related_project_id)
      .maybeSingle();
    relatedProjectTitle = project?.title ?? null;
  }

  return {
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    description: ticket.description,
    createdAt: ticket.created_at,
    requesterId: ticket.user_id,
    requesterName: fullNameOf(requester?.first_name ?? null, requester?.last_name ?? null),
    requesterEmail: requester?.email ?? null,
    requesterRole: requester?.role === "freelancer" || requester?.role === "client" ? requester.role : null,
    relatedProjectId: ticket.related_project_id,
    relatedProjectTitle,
  };
}

/**
 * `support_ticket_messages` INSERT RLS'i sadece iki durumu izin verir:
 * gönderen ticket'ın sahibiyse (`Ticket owners can add messages`), ya da
 * gönderen admin'se (`Admins can reply to ticket messages`). Bu yüzden
 * "gönderen ticket sahibi değilse admin'dir" güvenle çıkarılabilir —
 * `admin_users`'ı ayrıca sorgulamaya (ve o tablonun "sadece kendi
 * satırını gör" RLS'ini genişletmeye) gerek yok.
 */
export async function getAdminSupportTicketMessages(
  supabase: SupabaseClient,
  ticketId: string,
  requesterId: string
): Promise<{ items: AdminSupportTicketMessage[]; error: boolean }> {
  const { data, error } = await supabase
    .from("support_ticket_messages")
    .select("id, sender_id, message, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("[CollaCrew Admin] Destek talebi mesajları alınamadı:", error);
    return { items: [], error: true };
  }

  const senderIds = [...new Set(data.map((m) => m.sender_id))];
  let namesById = new Map<string, string>();

  if (senderIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", senderIds);

    namesById = new Map((profileRows ?? []).map((p) => [p.id, fullNameOf(p.first_name, p.last_name)]));
  }

  return {
    items: data.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: namesById.get(m.sender_id) ?? "Bilinmeyen kullanıcı",
      isAdminSender: m.sender_id !== requesterId,
      message: m.message,
      createdAt: m.created_at,
    })),
    error: false,
  };
}

