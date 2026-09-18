"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  proposal_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

type ProposalMessagesProps = {
  proposalId: string;
  otherUserId: string;
};

export default function ProposalMessages({
  proposalId,
  otherUserId,
}: ProposalMessagesProps) {
  const supabase = useMemo(() => createClient(), []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function loadMessages() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Mesajlar alınamadı:", error);
      } else {
        setMessages(data ?? []);

        const unreadIds = (data ?? [])
          .filter(
            (message) =>
              message.receiver_id === user.id && !message.is_read
          )
          .map((message) => message.id);

        if (unreadIds.length > 0) {
          await supabase
            .from("messages")
            .update({ is_read: true })
            .in("id", unreadIds);
        }
      }

      setLoading(false);
    }

    if (proposalId) {
      void loadMessages();
    }
  }, [proposalId, supabase]);

  async function sendMessage() {
    const trimmedContent = content.trim();

    if (!trimmedContent || !currentUserId || sending) return;

    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        proposal_id: proposalId,
        sender_id: currentUserId,
        receiver_id: otherUserId,
        content: trimmedContent,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Mesaj gönderilemedi:", error);
      setSending(false);
      return;
    }

    setMessages((current) => [...current, data as Message]);
    setContent("");
    setSending(false);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={18} className="animate-spin" />
          Mesajlar yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
          <MessageCircle size={20} className="text-gray-700" />
        </div>

        <div>
          <h2 className="font-semibold text-gray-900">
            Teklif Mesajları
          </h2>

          <p className="text-sm text-gray-500">
            Bu teklif ile ilgili iletişim
          </p>
        </div>
      </div>

      <div className="max-h-[450px] space-y-3 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="py-10 text-center">
            <MessageCircle
              size={32}
              className="mx-auto text-gray-300"
            />

            <p className="mt-3 text-sm text-gray-500">
              Henüz mesaj yok.
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Bu teklif hakkında konuşmaya başlayabilirsiniz.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === currentUserId;

            return (
              <div
                key={message.id}
                className={`flex ${
                  isMine ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    isMine
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">
                    {message.content}
                  </p>

                  <p
                    className={`mt-2 text-[11px] ${
                      isMine
                        ? "text-gray-300"
                        : "text-gray-400"
                    }`}
                  >
                    {new Date(
                      message.created_at
                    ).toLocaleString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-gray-100 p-4">
        <div className="flex gap-3">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Teklif hakkında mesaj yaz..."
            className="min-h-[52px] flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400"
          />

          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!content.trim() || sending}
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Mesaj gönder"
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-400">
          Enter ile gönder, Shift + Enter ile yeni satır.
        </p>
      </div>
    </section>
  );
}