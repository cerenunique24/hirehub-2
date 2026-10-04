"use client";

import { useMemo, useState } from "react";
import { Flag, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { friendlyRpcError } from "@/lib/utils/rpcError";
import { REPORT_REASON_LABEL } from "@/lib/marketplace/labels";

/**
 * Kullanıcı / proje / mesaj şikayeti. Şikayet `report_target` RPC'si ile
 * kaydedilir (sunucu tarafı doğrulama: yalnızca görebildiğin içerik
 * şikayet edilebilir, aynı içerik iki kez şikayet edilemez) ve admin
 * panelindeki "Şikayetler" ekranına düşer.
 */
export default function ReportButton({
  targetType,
  targetId,
  label = "Şikayet Et",
  className,
}: {
  targetType: "user" | "project" | "message" | "review";
  targetId: string;
  label?: string;
  className?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit() {
    setBusy(true);
    setFeedback(null);

    const { error } = await supabase.rpc("report_target", {
      p_target_type: targetType,
      p_target_id: targetId,
      p_reason: reason,
      p_details: details.trim() || null,
    });

    setBusy(false);

    if (error) {
      setFeedback({ tone: "error", text: friendlyRpcError(error, "Şikayet gönderilemedi. Lütfen tekrar dene.") });
      return;
    }

    setFeedback({ tone: "success", text: "Şikayetin CollaCrew ekibine iletildi. Teşekkürler." });
    setOpen(false);
    setDetails("");
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setFeedback(null);
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        <Flag size={14} />
        {label}
      </button>

      {feedback && (
        <p className={`mt-2 text-sm ${feedback.tone === "success" ? "text-green-700" : "text-red-700"}`}>
          {feedback.text}
        </p>
      )}

      {open && (
        <div className="mt-3 w-full max-w-md space-y-2 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            {Object.entries(REPORT_REASON_LABEL).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Ek açıklama (opsiyonel)"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Gönder
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
