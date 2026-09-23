"use client";

import { useState } from "react";
import { AlertTriangle, Send } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { notifyUsers } from "@/lib/notifications";
import { TICKET_STATUS_LABEL, type TicketStatus } from "@/lib/support";
import EmptyState from "../../components/EmptyState";
import Badge from "../../components/Badge";
import type { AdminSupportTicketMessage } from "../data";

const STATUS_OPTIONS = [
  { value: "open", label: "Açık" },
  { value: "in_progress", label: "İşlemde" },
  { value: "waiting_user", label: "Kullanıcı Bekleniyor" },
  { value: "resolved", label: "Çözüldü" },
  { value: "closed", label: "Kapatıldı" },
];

function statusVariant(status: string): "warning" | "info" | "success" | "neutral" {
  if (status === "open") return "warning";
  if (status === "in_progress" || status === "waiting_user") return "info";
  if (status === "resolved" || status === "closed") return "success";
  return "neutral";
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ticketLink(requesterRole: "freelancer" | "client" | null, ticketId: string): string | undefined {
  if (requesterRole === "client") return `/client/help/tickets/${ticketId}`;
  if (requesterRole === "freelancer") return `/freelancers/help/tickets/${ticketId}`;
  return undefined;
}

export default function TicketConversation({
  ticketId,
  initialStatus,
  initialMessages,
  messagesLoadError,
  requesterId,
  requesterRole,
}: {
  ticketId: string;
  initialStatus: string;
  initialMessages: AdminSupportTicketMessage[];
  messagesLoadError: boolean;
  requesterId: string;
  requesterRole: "freelancer" | "client" | null;
}) {
  const supabase = createClient();

  const [status, setStatus] = useState(initialStatus);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState("");

  const [messages, setMessages] = useState(initialMessages);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  async function handleStatusChange(newStatus: string) {
    const previous = status;
    if (newStatus === previous) return;

    setStatus(newStatus);
    setStatusUpdating(true);
    setStatusError("");

    const { error } = await supabase.from("support_tickets").update({ status: newStatus }).eq("id", ticketId);

    if (error) {
      console.error("[CollaCrew Admin] Talep durumu güncellenemedi:", error);
      setStatus(previous);
      setStatusError("Durum güncellenemedi. Tekrar deneyin.");
      setStatusUpdating(false);
      return;
    }

    const statusLabel = TICKET_STATUS_LABEL[newStatus as TicketStatus] ?? newStatus;

    await supabase.rpc("log_audit_event", {
      p_event_type: "support_ticket_status_changed",
      p_target_table: "support_tickets",
      p_target_id: ticketId,
      p_metadata: { from: previous, to: newStatus },
    });

    const { error: notifyError } = await notifyUsers(supabase, [
      {
        userId: requesterId,
        type: "support_status_update",
        title: "Destek talebiniz güncellendi",
        message: `Destek talebiniz "${statusLabel}" olarak güncellendi.`,
        link: ticketLink(requesterRole, ticketId),
      },
    ]);

    if (notifyError) {
      console.error("[CollaCrew Admin] Durum güncelleme bildirimi oluşturulamadı:", notifyError);
    }

    setStatusUpdating(false);
  }

  async function handleSendReply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSendError("");

    const trimmed = reply.trim();
    if (!trimmed) return;

    setSending(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSendError("Oturum bulunamadı, sayfayı yenileyin.");
      setSending(false);
      return;
    }

    const { data, error } = await supabase
      .from("support_ticket_messages")
      .insert({ ticket_id: ticketId, sender_id: user.id, message: trimmed })
      .select("id, sender_id, message, created_at")
      .single();

    if (error || !data) {
      console.error("[CollaCrew Admin] Yanıt gönderilemedi:", error);
      setSendError("Yanıt gönderilemedi. Tekrar deneyin.");
      setSending(false);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: data.id,
        senderId: data.sender_id,
        senderName: "Admin (siz)",
        isAdminSender: true,
        message: data.message,
        createdAt: data.created_at,
      },
    ]);
    setReply("");

    const { error: notifyError } = await notifyUsers(supabase, [
      {
        userId: requesterId,
        type: "support_reply",
        title: "Destek talebinize yanıt geldi",
        message: "CollaCrew destek ekibi destek talebinize yeni bir yanıt gönderdi.",
        link: ticketLink(requesterRole, ticketId),
      },
    ]);

    if (notifyError) {
      console.error("[CollaCrew Admin] Yanıt bildirimi oluşturulamadı:", notifyError);
    }

    setSending(false);
  }

  return (
    <div className="space-y-4">
      <section className="border border-[#e5e7eb] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#111111]">Mesaj Geçmişi</h2>

          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(status)}>{status}</Badge>
            <select
              value={status}
              disabled={statusUpdating}
              onChange={(e) => void handleStatusChange(e.target.value)}
              className="h-8 border border-[#e5e7eb] bg-white px-2 text-xs text-[#111111] outline-none focus:border-[#2563EB] disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {statusError && <p className="border-b border-[#f0f0f0] px-5 py-2 text-xs text-[#DC2626]">{statusError}</p>}

        {messagesLoadError ? (
          <EmptyState
            icon={AlertTriangle}
            tone="error"
            title="Veriler yüklenirken bir hata oluştu."
            description="Mesaj geçmişi Supabase'den alınamadı. Sunucu loglarında ayrıntı mevcut."
          />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="Henüz kayıt bulunmuyor."
            description="Bu talepte henüz bir mesaj yok."
          />
        ) : (
          <ul className="space-y-3 px-5 py-4">
            {messages.map((message) => (
              <li
                key={message.id}
                className={`max-w-[85%] px-3.5 py-2.5 text-sm ${
                  message.isAdminSender ? "ml-auto bg-[#EFF6FF]" : "bg-[#F7F7F8]"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-[#6b7280]">
                  <span className="font-medium text-[#111111]">
                    {message.isAdminSender ? "Admin" : message.senderName}
                  </span>
                  <span>{formatDateTime(message.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-[#374151]">{message.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={handleSendReply} className="border border-[#e5e7eb] bg-white p-4">
        <label className="mb-1.5 block text-sm font-medium text-[#111111]">Yanıt yaz</label>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          placeholder="Kullanıcıya bir yanıt yazın..."
          className="w-full resize-none border border-[#e5e7eb] bg-white p-3 text-sm text-[#111111] outline-none focus:border-[#2563EB]"
        />

        {sendError && <p className="mt-2 text-xs text-[#DC2626]">{sendError}</p>}

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={sending || !reply.trim()}
            className="inline-flex items-center gap-1.5 bg-[#111111] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={14} />
            {sending ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>
      </form>
    </div>
  );
}
