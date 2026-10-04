"use client";

import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

/**
 * Bir kullanıcının aldığı değerlendirmelerin ortalaması (get_rating_summary
 * RPC'si). Yalnızca tamamlanmış projelerden üretilmiş, gizlenmemiş
 * değerlendirmeleri sayar; değerlendirme yoksa sahte bir puan GÖSTERİLMEZ.
 */
export default function RatingSummary({ userId, className }: { userId: string; className?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [summary, setSummary] = useState<{ avg: number; count: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.rpc("get_rating_summary", { p_user_id: userId }).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setFailed(true);
        setLoaded(true);
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      const count = Number(row?.rating_count ?? 0);
      setSummary(count > 0 ? { avg: Number(row?.rating_avg ?? 0), count } : null);
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [supabase, userId]);

  if (!loaded || failed) return null;

  return (
    <div className={className}>
      {summary ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
          <Star size={13} className="fill-amber-500 text-amber-500" />
          {summary.avg.toFixed(1)} · {summary.count} değerlendirme
        </span>
      ) : (
        <span className="text-xs text-neutral-400">Henüz değerlendirme yok</span>
      )}
    </div>
  );
}
