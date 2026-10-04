"use client";

import { useMemo, useState } from "react";
import { Flag, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { friendlyRpcError } from "@/lib/utils/rpcError";
import Badge from "../components/Badge";

export type AdminReview = {
  id: string;
  projectTitle: string;
  reviewerName: string;
  revieweeName: string;
  rating: number;
  comment: string | null;
  isHidden: boolean;
  moderationReason: string | null;
  createdAt: string;
  isReported: boolean;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReviewsManager({ reviews: initial }: { reviews: AdminReview[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [reviews, setReviews] = useState(
    [...initial].sort((a, b) => Number(b.isReported) - Number(a.isReported))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function setHidden(review: AdminReview, hidden: boolean) {
    setBusy(review.id);
    setMessage(null);

    const { error } = await supabase.rpc("admin_set_review_visibility", {
      p_review_id: review.id,
      p_hidden: hidden,
      p_reason: hidden ? (reasonDrafts[review.id] ?? "").trim() : null,
    });

    setBusy(null);

    if (error) {
      setMessage({ tone: "error", text: friendlyRpcError(error, "Değerlendirme güncellenemedi.") });
      return;
    }

    setReviews((current) =>
      current.map((r) =>
        r.id === review.id
          ? { ...r, isHidden: hidden, moderationReason: hidden ? reasonDrafts[review.id] ?? null : null }
          : r
      )
    );
    setMessage({ tone: "success", text: hidden ? "Değerlendirme gizlendi." : "Değerlendirme yeniden gösteriliyor." });
  }

  return (
    <div className="space-y-3">
      {message && (
        <div
          className={`border p-3 text-sm ${
            message.tone === "success"
              ? "border-[#bbf7d0] bg-[#F0FDF4] text-[#166534]"
              : "border-[#fecaca] bg-[#FEF2F2] text-[#991b1b]"
          }`}
        >
          {message.text}
        </div>
      )}

      {reviews.map((review) => (
        <div key={review.id} className="space-y-3 border border-[#e5e7eb] bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-[#111111]">
                {review.reviewerName} → {review.revieweeName} · {review.projectTitle}
              </p>
              <p className="mt-0.5 text-xs text-[#6b7280]">
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)} · {formatDateTime(review.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              {review.isReported && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-[#DC2626]">
                  <Flag size={11} /> Şikayet edildi
                </span>
              )}
              <Badge variant={review.isHidden ? "neutral" : "success"}>
                {review.isHidden ? "Gizli" : "Görünür"}
              </Badge>
            </div>
          </div>

          {review.comment && <p className="text-[#374151]">{review.comment}</p>}
          {review.isHidden && review.moderationReason && (
            <p className="text-xs text-[#6b7280]">Gizleme nedeni: {review.moderationReason}</p>
          )}

          {review.isHidden ? (
            <button
              type="button"
              disabled={busy === review.id}
              onClick={() => void setHidden(review, false)}
              className="inline-flex h-9 items-center gap-2 border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#111111] hover:bg-[#F7F7F8] disabled:opacity-50"
            >
              {busy === review.id && <Loader2 size={14} className="animate-spin" />}
              Yeniden Göster
            </button>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={reasonDrafts[review.id] ?? ""}
                onChange={(e) => setReasonDrafts((c) => ({ ...c, [review.id]: e.target.value }))}
                placeholder="Gizleme nedeni"
                className="h-9 flex-1 border border-[#e5e7eb] px-3 text-sm"
              />
              <button
                type="button"
                disabled={busy === review.id || (reasonDrafts[review.id] ?? "").trim().length < 3}
                onClick={() => void setHidden(review, true)}
                className="inline-flex h-9 items-center gap-2 border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#111111] hover:bg-[#F7F7F8] disabled:opacity-50"
              >
                {busy === review.id && <Loader2 size={14} className="animate-spin" />}
                Gizle
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
