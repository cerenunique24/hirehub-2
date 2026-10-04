"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { friendlyRpcError } from "@/lib/utils/rpcError";

/**
 * Kullanıcı engelleme / engeli kaldırma. Engel `user_blocks` tablosunda tutulur
 * ve mesaj gönderimi RLS seviyesinde ("Blocked users cannot exchange messages")
 * iki yönde de reddedilir; yalnızca arayüzde gizlemek değildir.
 */
export default function BlockUserButton({
  targetUserId,
  onChange,
  className,
}: {
  targetUserId: string;
  onChange?: (blocked: boolean) => void;
  className?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || !active) return;

      const { data, error: loadError } = await supabase
        .from("user_blocks")
        .select("blocked_id")
        .eq("blocker_id", auth.user.id)
        .eq("blocked_id", targetUserId)
        .maybeSingle();

      if (!active) return;

      if (loadError) {
        setError("Engel durumu yüklenemedi.");
        return;
      }

      setBlocked(Boolean(data));
    }

    void load();

    return () => {
      active = false;
    };
  }, [supabase, targetUserId]);

  async function toggle() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    if (!blocked && !window.confirm("Bu kullanıcıyı engellemek istediğine emin misin? Birbirinize mesaj gönderemezsiniz.")) {
      return;
    }

    setBusy(true);
    setError("");

    const { error: actionError } = blocked
      ? await supabase.from("user_blocks").delete().eq("blocker_id", auth.user.id).eq("blocked_id", targetUserId)
      : await supabase.from("user_blocks").insert({ blocker_id: auth.user.id, blocked_id: targetUserId });

    setBusy(false);

    if (actionError) {
      setError(friendlyRpcError(actionError, "İşlem tamamlanamadı. Lütfen tekrar dene."));
      return;
    }

    setBlocked(!blocked);
    onChange?.(!blocked);
  }

  if (blocked === null) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
        {blocked ? "Engeli Kaldır" : "Engelle"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
