"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  getTeamMessages,
  sendTeamMessage,
  type TeamMessage,
} from "@/lib/coalitions/teamMessages";

type MemberLabel = {
  id: string;
  name: string;
};

/**
 * Ekip (coalition) mesajlaşma paneli — client ve freelancer koalisyon detay
 * sayfalarının ikisinde de aynı şekilde kullanılır. Proje başlamadan önce
 * (client.status = open/ready_to_start) de erişilebilir olması gereken tek
 * kısıt DB-side RLS'tir (aktif coalition üyesi ya da projenin client'ı) —
 * bu bileşen proje durumuna hiç bakmaz.
 */
export default function TeamMessagesPanel({
  coalitionId,
  currentUserId,
  memberLabels,
}: {
  coalitionId: string;
  currentUserId: string;
  memberLabels: MemberLabel[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    memberLabels.forEach((member) => map.set(member.id, member.name));
    return map;
  }, [memberLabels]);

  async function loadMessages() {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await getTeamMessages(
      supabase,
      coalitionId
    );

    if (loadError) {
      setError("Ekip mesajları yüklenemedi.");
    } else {
      setMessages(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coalitionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const content = draft.trim();

    if (!content) return;

    setSending(true);
    setError("");

    const { error: sendError } = await sendTeamMessage(
      supabase,
      coalitionId,
      currentUserId,
      content
    );

    if (sendError) {
      setError("Mesaj gönderilemedi.");
    } else {
      setDraft("");
      await loadMessages();
    }

    setSending(false);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <div className="max-h-80 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-neutral-500">
            <Loader2 size={16} className="animate-spin" />
            Ekip mesajları yükleniyor...
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">
            Henüz ekip mesajı yok. İlk mesajı sen gönder.
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === currentUserId;
            const senderName =
              nameById.get(message.sender_id) ?? "Ekip üyesi";

            return (
              <div
                key={message.id}
                className={`flex flex-col ${
                  isMine ? "items-end" : "items-start"
                }`}
              >
                <span className="mb-1 text-xs text-neutral-400">
                  {isMine ? "Sen" : senderName}
                </span>

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-6 ${
                    isMine
                      ? "bg-[var(--color-primary-600)] text-white"
                      : "bg-neutral-100 text-neutral-800"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="border-t border-neutral-100 px-4 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-neutral-100 p-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Ekibe bir mesaj yaz..."
          className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-900"
        />

        <button
          type="button"
          disabled={sending || !draft.trim()}
          onClick={() => void handleSend()}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-600)] text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
