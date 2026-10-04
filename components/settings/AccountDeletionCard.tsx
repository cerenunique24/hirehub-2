"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { friendlyRpcError } from "@/lib/utils/rpcError";

type DeletionRequest = { id: string; status: string; requested_at: string };

/**
 * KVKK kapsamında hesap silme TALEBİ. Hesap anında silinmez: aktif projeler,
 * ödeme yükümlülükleri ve yasal saklama süreleri kontrol edildikten sonra
 * CollaCrew ekibi talebi işleme alır. Talep `account_deletion_requests`
 * tablosunda tutulur ve kullanıcı bekleyen talebini geri çekebilir.
 */
export default function AccountDeletionCard() {
  const supabase = useMemo(() => createClient(), []);
  const [request, setRequest] = useState<DeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("account_deletion_requests")
        .select("id, status, requested_at")
        .in("status", ["pending", "processing"])
        .maybeSingle();

      if (!active) return;

      if (error) {
        setFeedback({ tone: "error", text: "Silme talebi durumu yüklenemedi." });
      }

      setRequest((data as DeletionRequest | null) ?? null);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [supabase, reloadKey]);

  async function submit() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    setBusy(true);
    setFeedback(null);

    const { error } = await supabase.from("account_deletion_requests").insert({
      user_id: auth.user.id,
      reason: reason.trim() || null,
      status: "pending",
    });

    setBusy(false);

    if (error) {
      setFeedback({
        tone: "error",
        text:
          error.code === "23505"
            ? "Zaten bekleyen bir silme talebin var."
            : friendlyRpcError(error, "Talep oluşturulamadı. Lütfen tekrar dene."),
      });
      return;
    }

    setConfirming(false);
    setReason("");
    setFeedback({ tone: "success", text: "Hesap silme talebin alındı. CollaCrew ekibi en kısa sürede seninle iletişime geçecek." });
    setReloadKey((key) => key + 1);
  }

  async function withdraw() {
    if (!request) return;

    setBusy(true);
    setFeedback(null);

    const { error } = await supabase
      .from("account_deletion_requests")
      .update({ status: "cancelled" })
      .eq("id", request.id)
      .eq("status", "pending");

    setBusy(false);

    if (error) {
      setFeedback({ tone: "error", text: "Talep geri çekilemedi. Lütfen tekrar dene." });
      return;
    }

    setFeedback({ tone: "success", text: "Hesap silme talebin geri çekildi." });
    setReloadKey((key) => key + 1);
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Yükleniyor...</p>;
  }

  return (
    <div className="rounded-lg bg-[var(--color-canvas)] px-4 py-4">
      <p className="text-sm font-medium text-[var(--color-text-primary)]">Hesabı sil</p>

      {request ? (
        <>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {request.status === "processing"
              ? "Silme talebin işleme alındı."
              : "Silme talebin alındı ve inceleme bekliyor."}{" "}
            Talep tarihi: {new Date(request.requested_at).toLocaleDateString("tr-TR")}
          </p>
          {request.status === "pending" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void withdraw()}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Talebi Geri Çek
            </button>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Hesabını ve kişisel verilerini silmek için talep oluşturabilirsin. Devam eden projelerin veya
            tamamlanmamış ödeme yükümlülüklerin varsa talep bunlar çözüldükten sonra işleme alınır.
          </p>

          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Hesap Silme Talebi Oluştur
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Ayrılma nedenin (opsiyonel)"
                className="w-full rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submit()}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  Talebi Gönder
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-lg border border-[var(--color-border-subtle)] bg-white px-4 py-2 text-sm font-medium"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {feedback && (
        <p className={`mt-3 text-xs ${feedback.tone === "success" ? "text-green-700" : "text-red-700"}`}>
          {feedback.text}
        </p>
      )}
    </div>
  );
}
