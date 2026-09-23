"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addTicketMessage,
  fetchTicket,
  fetchTicketMessages,
  TICKET_STATUS_LABEL,
  type SupportTicket,
  type SupportTicketMessage,
} from "@/lib/support";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function TicketDetail({ ticketId, backHref }: { ticketId: string; backHref: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Giriş yapmanız gerekiyor.");
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const { data: ticketData, error: ticketError } = await fetchTicket(supabase, ticketId);
    if (ticketError || !ticketData) {
      setError("Destek talebi bulunamadı.");
      setLoading(false);
      return;
    }
    setTicket(ticketData as SupportTicket);

    const { data: messageRows } = await fetchTicketMessages(supabase, ticketId);
    setMessages((messageRows ?? []) as SupportTicketMessage[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function handleSendReply() {
    if (!userId || !reply.trim()) return;
    setSending(true);
    const { error: sendError } = await addTicketMessage(supabase, ticketId, userId, reply.trim());
    if (!sendError) {
      setReply("");
      await load();
    }
    setSending(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        <Loader2 size={18} className="mr-2 animate-spin" />
        Yükleniyor...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="rounded-xl border border-red-100 bg-white p-6">
        <p className="text-sm text-red-600">{error || "Destek talebi bulunamadı."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        Destek taleplerine dön
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{ticket.subject}</h1>
            <p className="mt-1 text-xs text-gray-400">
              Oluşturulma: {formatDateTime(ticket.created_at)} · Son güncelleme: {formatDateTime(ticket.updated_at)}
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {TICKET_STATUS_LABEL[ticket.status]}
          </span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">{ticket.description}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-gray-900">Mesajlar</h2>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500">Henüz mesaj yok.</p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="rounded-xl bg-gray-50 p-4 text-sm">
                <p className="text-gray-700">{message.message}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDateTime(message.created_at)}</p>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Mesaj ekle..."
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleSendReply()}
            disabled={sending || !reply.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
