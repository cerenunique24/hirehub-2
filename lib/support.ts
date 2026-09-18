import type { SupabaseClient } from "@supabase/supabase-js";

export type HelpArticle = {
  id: string;
  audience: "client" | "freelancer" | "all";
  category: string;
  question: string;
  answer: string;
  sort_order: number;
};

export type TicketStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  category: string | null;
  description: string;
  related_project_id: string | null;
  priority: "low" | "normal" | "high";
  status: TicketStatus;
  created_at: string;
  updated_at: string;
};

export type SupportTicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

export async function fetchHelpArticles(supabase: SupabaseClient, audience: "client" | "freelancer") {
  return supabase
    .from("help_articles")
    .select("id, audience, category, question, answer, sort_order")
    .in("audience", [audience, "all"])
    .order("sort_order", { ascending: true });
}

export async function fetchOwnTickets(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("support_tickets")
    .select("id, user_id, subject, category, description, related_project_id, priority, status, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function fetchTicket(supabase: SupabaseClient, ticketId: string) {
  return supabase
    .from("support_tickets")
    .select("id, user_id, subject, category, description, related_project_id, priority, status, created_at, updated_at")
    .eq("id", ticketId)
    .single();
}

export async function createTicket(
  supabase: SupabaseClient,
  input: {
    userId: string;
    subject: string;
    category?: string | null;
    description: string;
    relatedProjectId?: string | null;
    priority?: "low" | "normal" | "high";
  }
) {
  return supabase
    .from("support_tickets")
    .insert({
      user_id: input.userId,
      subject: input.subject,
      category: input.category ?? null,
      description: input.description,
      related_project_id: input.relatedProjectId ?? null,
      priority: input.priority ?? "normal",
    })
    .select()
    .single();
}

export async function fetchTicketMessages(supabase: SupabaseClient, ticketId: string) {
  return supabase
    .from("support_ticket_messages")
    .select("id, ticket_id, sender_id, message, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
}

export async function addTicketMessage(
  supabase: SupabaseClient,
  ticketId: string,
  senderId: string,
  message: string
) {
  return supabase
    .from("support_ticket_messages")
    .insert({ ticket_id: ticketId, sender_id: senderId, message })
    .select()
    .single();
}

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Açık",
  in_progress: "İnceleniyor",
  waiting_user: "Yanıtınız bekleniyor",
  resolved: "Çözüldü",
  closed: "Kapatıldı",
};
