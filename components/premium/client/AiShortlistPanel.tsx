"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import PremiumGate from "@/components/premium/PremiumGate";

type ShortlistItem = {
  freelancerId: string;
  name: string;
  title: string | null;
  avatarUrl: string | null;
  role: string;
  score: number;
  reason: string;
};

/**
 * Client "AI Freelancer Shortlist" (Plus) / "Gelişmiş AI Shortlist"
 * (Pro, daha geniş liste) — bu projeye gerçekten uygun (role
 * eligibility geçen) freelancer'ları, Discover/proposal ile AYNI
 * deterministic motoru kullanarak sıralar.
 */
export default function AiShortlistPanel({ projectId }: { projectId: string }) {
  const [shortlist, setShortlist] = useState<ShortlistItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadShortlist() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/premium/client/ai-shortlist?projectId=${projectId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Shortlist alınamadı.");
        return;
      }

      setShortlist(data.shortlist ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <PremiumGate
        feature="ai_freelancer_shortlist"
        title="AI Freelancer Shortlist"
        description="Bu proje için gerçekten uygun freelancer'ları tüm havuzdan otomatik sırala."
        dismissible
      >
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gray-700" />
              <h2 className="font-semibold text-gray-900">AI Freelancer Shortlist</h2>
            </div>

            {!shortlist && (
              <button
                type="button"
                onClick={() => void loadShortlist()}
                disabled={loading}
                className="rounded-lg bg-[var(--color-primary-600)] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-700)] disabled:opacity-50"
              >
                {loading ? "Hesaplanıyor..." : "Shortlist Oluştur"}
              </button>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          {shortlist && (
            shortlist.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">Şu anda bu projeye gerçekten uygun bir freelancer bulunamadı.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {shortlist.map((item) => (
                  <Link
                    key={item.freelancerId}
                    href={`/client/freelancers/${item.freelancerId}`}
                    className="flex items-center justify-between rounded-xl border border-gray-100 p-3 transition hover:border-gray-300"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="truncate text-xs text-gray-500">{item.role}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--color-primary-600)] px-2.5 py-1 text-xs font-semibold text-white">
                      %{Math.round(item.score)}
                    </span>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </PremiumGate>
    </section>
  );
}
