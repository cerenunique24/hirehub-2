"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DISPUTE_OUTCOME_LABEL,
  DISPUTE_REASON_LABEL,
  DISPUTE_STATUS_LABEL,
} from "@/lib/marketplace/labels";

type Dispute = {
  id: string;
  project_id: string;
  opened_by: string;
  opener_role: string | null;
  reason: string;
  description: string | null;
  status: string;
  resolution: string | null;
  resolution_outcome: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type Evidence = {
  id: string;
  submitted_by: string;
  note: string | null;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
};

const NEXT_STEP: Record<string, string> = {
  open: "CollaCrew ekibi uyuşmazlığı inceleyecek. Gerekirse sana ek kanıt için ulaşılabilir.",
  under_review: "Uyuşmazlık incelemede. Yeni kanıt eklemek istersen bu sayfadan ekleyebilirsin.",
  resolved: "Uyuşmazlık sonuçlandı. Karar aşağıda belirtilmiştir.",
  closed: "Uyuşmazlık kapatıldı. Başka bir işlem gerekmiyor.",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export default function DisputeDetail({
  disputeId,
  backHref,
}: {
  disputeId: string;
  backHref: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>("Proje");
  const [evidence, setEvidence] = useState<Array<Evidence & { url?: string }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [responseDraft, setResponseDraft] = useState("");
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [responseError, setResponseError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setCurrentUserId(user?.id ?? null);

      const { data: row } = await supabase
        .from("disputes")
        .select(
          "id, project_id, opened_by, opener_role, reason, description, status, resolution, resolution_outcome, resolved_at, created_at, updated_at"
        )
        .eq("id", disputeId)
        .maybeSingle();

      if (!active) return;
      if (!row) {
        setDispute(null);
        setLoading(false);
        return;
      }
      setDispute(row as Dispute);

      const { data: project } = await supabase
        .from("projects")
        .select("title")
        .eq("id", row.project_id)
        .maybeSingle();
      if (active && project?.title) setProjectTitle(project.title);

      const { data: evidenceRows } = await supabase
        .from("dispute_evidence")
        .select("id, submitted_by, note, file_path, file_name, created_at")
        .eq("dispute_id", disputeId)
        .order("created_at", { ascending: true });

      const withFiles = (evidenceRows ?? []) as Evidence[];
      const paths = withFiles.map((e) => e.file_path).filter((p): p is string => Boolean(p));
      const signedByPath = new Map<string, string>();
      if (paths.length > 0) {
        const { data: signed } = await supabase.storage.from("dispute-evidence").createSignedUrls(paths, 60 * 10);
        (signed ?? []).forEach((entry) => {
          if (!entry.error && entry.signedUrl && entry.path) signedByPath.set(entry.path, entry.signedUrl);
        });
      }

      if (active) {
        setEvidence(withFiles.map((e) => ({ ...e, url: e.file_path ? signedByPath.get(e.file_path) : undefined })));
        setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [disputeId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        Uyuşmazlık yükleniyor...
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="p-6">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-gray-500">
          <ArrowLeft size={16} />
          Yardım
        </Link>
        <p className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
          Bu uyuşmazlık bulunamadı veya görüntüleme yetkiniz yok.
        </p>
      </div>
    );
  }

  const isOpener = currentUserId === dispute.opened_by;
  const openerRoleLabel = dispute.opener_role === "client" ? "Müşteri (Client)" : "Freelancer";
  const counterpartyRoleLabel = dispute.opener_role === "client" ? "Freelancer" : "Müşteri (Client)";
  const myRoleLabel = isOpener ? openerRoleLabel : counterpartyRoleLabel;
  const canRespond = !isOpener && (dispute.status === "open" || dispute.status === "under_review");
  const counterpartyEvidence = evidence.filter((e) => e.submitted_by !== dispute.opened_by);
  const noteEvidence = evidence.filter((e) => !e.file_path);
  const fileEvidence = evidence.filter((e) => Boolean(e.file_path));

  async function submitResponse() {
    const text = responseDraft.trim();
    if (!text || submittingResponse) return;
    setSubmittingResponse(true);
    setResponseError("");

    const { error } = await supabase.rpc("add_dispute_evidence", {
      p_dispute_id: disputeId,
      p_note: text,
    });

    setSubmittingResponse(false);

    if (error) {
      setResponseError(
        error.code === "P0001" ? error.message : "Yanıt gönderilemedi. Lütfen tekrar deneyin."
      );
      return;
    }

    setResponseDraft("");
    setEvidence((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        submitted_by: currentUserId ?? "",
        note: text,
        file_path: null,
        file_name: null,
        created_at: new Date().toISOString(),
      },
    ]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        Yardım
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Uyuşmazlık</p>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">{projectTitle}</h1>
        <p className="mt-1 text-sm text-gray-600">{DISPUTE_REASON_LABEL[dispute.reason] ?? dispute.reason}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-400">Uyuşmazlığı açan</dt>
            <dd className="font-medium text-gray-900">{openerRoleLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Karşı taraf</dt>
            <dd className="font-medium text-gray-900">{counterpartyRoleLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Senin rolün</dt>
            <dd className="font-medium text-gray-900">{myRoleLabel}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-gray-400">Açılış: {formatDate(dispute.created_at)}</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">Açıklama</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
          {dispute.description || "Açıklama eklenmemiş."}
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">Yanıtlar</h2>
        {noteEvidence.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Henüz yazılı yanıt yok.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {noteEvidence.map((e) => (
              <li key={e.id} className="py-3">
                <p className="text-xs font-medium text-gray-500">
                  {e.submitted_by === dispute.opened_by ? `${openerRoleLabel} · Açan taraf` : `${counterpartyRoleLabel} · Karşı taraf yanıtı`}
                  {e.submitted_by === currentUserId ? " (sen)" : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-800">{e.note}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDate(e.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">Kanıtlar</h2>
        {fileEvidence.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Henüz dosya kanıtı eklenmemiş.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {fileEvidence.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-gray-800">
                    {e.note || e.file_name || "Kanıt"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {e.submitted_by === currentUserId ? "Sen ekledin" : "Karşı taraf ekledi"} · {formatDate(e.created_at)}
                  </p>
                </div>
                {e.url && (
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary-600)] hover:underline">
                    <FileText size={14} />
                    Dosyayı görüntüle
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        {counterpartyEvidence.filter((e) => e.file_path).length === 0 && fileEvidence.length > 0 && (
          <p className="mt-3 text-xs text-gray-400">Karşı taraf henüz dosya kanıtı eklemedi.</p>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">Karşı taraf yanıtı</h2>
        {canRespond ? (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-gray-500">
              Yanıtın resmi uyuşmazlık kaydına eklenir ve açan tarafa gösterilir. Bu alandan gönderilen yanıt sonradan
              değiştirilemez.
            </p>
            <textarea
              value={responseDraft}
              onChange={(e) => setResponseDraft(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Uyuşmazlık hakkındaki açıklamanı yaz..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
            />
            {responseError && <p className="text-sm text-red-600">{responseError}</p>}
            <button
              type="button"
              onClick={() => void submitResponse()}
              disabled={submittingResponse || responseDraft.trim().length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {submittingResponse && <Loader2 size={15} className="animate-spin" />}
              Yanıtı gönder
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            {isOpener
              ? "Uyuşmazlığı sen açtığın için yanıt alanı karşı tarafa aittir."
              : "Bu uyuşmazlık artık yanıt kabul etmiyor."}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">İnceleme durumu</h2>
        <p className="mt-2 text-sm text-gray-700">{DISPUTE_STATUS_LABEL[dispute.status] ?? dispute.status}</p>
        <p className="mt-3 text-sm text-gray-600">{NEXT_STEP[dispute.status] ?? ""}</p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">Sonuç</h2>
        {dispute.status === "resolved" || dispute.status === "closed" ? (
          <div className="mt-2 space-y-2 text-sm text-gray-700">
            <p>{dispute.resolution_outcome ? DISPUTE_OUTCOME_LABEL[dispute.resolution_outcome] ?? dispute.resolution_outcome : "—"}</p>
            {dispute.resolution && <p className="whitespace-pre-wrap text-gray-600">{dispute.resolution}</p>}
            <p className="text-xs text-gray-400">Sonuçlanma: {formatDate(dispute.resolved_at)}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">Henüz karar verilmedi.</p>
        )}
      </section>
    </div>
  );
}
