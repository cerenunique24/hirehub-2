"use client";

import { useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { MESSAGE_ATTACHMENT_BUCKET, isImageAttachment } from "@/lib/messaging/attachments";

/**
 * Mesaj ekini gösterir. Görsel türleri thumbnail olarak önizlenir (signed
 * URL ile, bucket private olduğu için public URL kullanılamaz); diğer
 * türler dosya adı + indirme ikonuyla gösterilir. Yetkisiz bir kullanıcı
 * bu URL'i açmaya çalışırsa storage RLS'i reddeder (bkz. migration
 * 202609300016) — burası sadece sunum katmanıdır.
 */
export default function MessageAttachmentView({
  path,
  name,
  type,
  tone,
}: {
  path: string;
  name: string | null;
  type: string | null;
  tone: "mine" | "theirs";
}) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const isImage = isImageAttachment(type);

  async function open() {
    setLoading(true);
    setError(false);

    const { data, error: signError } = await supabase.storage
      .from(MESSAGE_ATTACHMENT_BUCKET)
      .createSignedUrl(path, 60 * 10);

    setLoading(false);

    if (signError || !data?.signedUrl) {
      setError(true);
      return;
    }

    if (isImage) {
      setPreviewUrl(data.signedUrl);
    } else {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  if (isImage && previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt={name ?? "Ek görsel"}
        className="mt-2 max-h-56 w-full rounded-xl object-cover"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => void open()}
      className={`mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${
        tone === "mine" ? "bg-white/15 text-white hover:bg-white/25" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
      <span className="flex-1 truncate text-left">{name ?? "Ek dosya"}</span>
      {error && <span className="text-red-400">Açılamadı</span>}
    </button>
  );
}
