"use client";

import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Loading } from "@/components/common/Loading";
import { Card } from "@/components/ui/Card";
import { panelRootClass } from "@/components/dashboard/PanelPrimitives";
import styles from "./SupportCenter.module.css";
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
      <div role="status"><Loading label="Uyuşmazlık yükleniyor…" /></div>
    );
  }

  if (!dispute) {
    return (
      <div className={panelRootClass+" "+styles.root}>
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <ArrowLeft size={16} />
          Yardım
        </Link>
        <p className="mt-6 rounded-xl bg-[var(--panel-subtle)] p-4 text-sm text-[var(--color-text-secondary)]">
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
    <div className={panelRootClass+" "+styles.root}>
      <Link href={backHref} className={buttonClasses({variant:"secondary"})}>
        <ArrowLeft size={16} />
        Yardım
      </Link>

      <Card className={styles.section}>
        <p className="cc-body-sm font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">Uyuşmazlık</p>
        <h1 className="mt-1 cc-page-title text-[var(--color-text-primary)]">{projectTitle}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{DISPUTE_REASON_LABEL[dispute.reason] ?? dispute.reason}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-[var(--color-text-secondary)]">Uyuşmazlığı açan</dt>
            <dd className="font-medium text-[var(--color-text-primary)]">{openerRoleLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-secondary)]">Karşı taraf</dt>
            <dd className="font-medium text-[var(--color-text-primary)]">{counterpartyRoleLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-secondary)]">Senin rolün</dt>
            <dd className="font-medium text-[var(--color-text-primary)]">{myRoleLabel}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-[var(--color-text-secondary)]">Açılış: {formatDate(dispute.created_at)}</p>
      </Card>

      <Card className={styles.section}>
        <h2 className="cc-h2 text-[var(--color-text-primary)]">Açıklama</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-secondary)]">
          {dispute.description || "Açıklama eklenmemiş."}
        </p>
      </Card>

      <Card className={styles.section}>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Yanıtlar</h2>
        {noteEvidence.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Henüz yazılı yanıt yok.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--color-border-subtle)]">
            {noteEvidence.map((e) => (
              <li key={e.id} className="py-3">
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {e.submitted_by === dispute.opened_by ? `${openerRoleLabel} · Açan taraf` : `${counterpartyRoleLabel} · Karşı taraf yanıtı`}
                  {e.submitted_by === currentUserId ? " (sen)" : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-primary)]">{e.note}</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{formatDate(e.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className={styles.section}>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Kanıtlar</h2>
        {fileEvidence.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Henüz dosya kanıtı eklenmemiş.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--color-border-subtle)]">
            {fileEvidence.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-[var(--color-text-primary)]">
                    {e.note || e.file_name || "Kanıt"}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
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
          <p className="mt-3 text-xs text-[var(--color-text-secondary)]">Karşı taraf henüz dosya kanıtı eklemedi.</p>
        )}
      </Card>

      <Card className={styles.section}>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Karşı taraf yanıtı</h2>
        {canRespond ? (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Yanıtın resmi uyuşmazlık kaydına eklenir ve açan tarafa gösterilir. Bu alandan gönderilen yanıt sonradan
              değiştirilemez.
            </p>
            <Textarea
              value={responseDraft}
              onChange={(e) => setResponseDraft(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Uyuşmazlık hakkındaki açıklamanı yaz..."

            />
            {responseError && <p className="text-sm text-red-600">{responseError}</p>}
            <Button
              type="button"
              onClick={() => void submitResponse()}
              disabled={submittingResponse || responseDraft.trim().length === 0}

            >
              {submittingResponse && <Loader2 size={15} className="animate-spin" />}
              Yanıtı gönder
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {isOpener
              ? "Uyuşmazlığı sen açtığın için yanıt alanı karşı tarafa aittir."
              : "Bu uyuşmazlık artık yanıt kabul etmiyor."}
          </p>
        )}
      </Card>

      <Card className={styles.section}>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">İnceleme durumu</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{DISPUTE_STATUS_LABEL[dispute.status] ?? dispute.status}</p>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{NEXT_STEP[dispute.status] ?? ""}</p>
      </Card>

      <Card className={styles.section}>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Sonuç</h2>
        {dispute.status === "resolved" || dispute.status === "closed" ? (
          <div className="mt-2 space-y-2 text-sm text-[var(--color-text-secondary)]">
            <p>{dispute.resolution_outcome ? DISPUTE_OUTCOME_LABEL[dispute.resolution_outcome] ?? dispute.resolution_outcome : "—"}</p>
            {dispute.resolution && <p className="whitespace-pre-wrap text-[var(--color-text-secondary)]">{dispute.resolution}</p>}
            <p className="text-xs text-[var(--color-text-secondary)]">Sonuçlanma: {formatDate(dispute.resolved_at)}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Henüz karar verilmedi.</p>
        )}
      </Card>
    </div>
  );
}
