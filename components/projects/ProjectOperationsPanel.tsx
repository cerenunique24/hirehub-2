"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, CalendarClock, FileText, Loader2, Scale, Star } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { friendlyRpcError } from "@/lib/utils/rpcError";
import { DEADLINE_STATUS_LABEL, getDeadlineStatus } from "@/lib/utils/deadline";
import {
  DISPUTE_OUTCOME_LABEL,
  DISPUTE_REASON_LABEL,
  DISPUTE_STATUS_LABEL,
  REQUEST_STATUS_LABEL,
} from "@/lib/marketplace/labels";
import type { Milestone } from "@/lib/projects/milestones";
import ReportButton from "@/components/safety/ReportButton";
import { publicDisplayName } from "@/lib/utils/displayName";

type PanelProject = {
  id: string;
  client_id: string;
  title: string;
  status: string | null;
};

type PanelTeamMember = {
  id: string;
  first_name: string | null;
  memberRole: string;
};

type ExtensionRequest = {
  id: string;
  milestone_id: string;
  requested_by: string;
  previous_due_date: string | null;
  requested_due_date: string;
  reason: string;
  status: string;
  response_note: string | null;
  created_at: string;
};

type CancellationRequest = {
  id: string;
  requested_by: string;
  requester_role: "client" | "freelancer";
  reason: string;
  status: string;
  response_note: string | null;
  created_at: string;
};

type Dispute = {
  id: string;
  milestone_id: string | null;
  opened_by: string;
  reason: string;
  description: string;
  status: string;
  resolution: string | null;
  resolution_outcome: string | null;
  created_at: string;
};

type DisputeEvidence = {
  id: string;
  dispute_id: string;
  note: string | null;
  file_path: string | null;
  file_name: string | null;
};

const EVIDENCE_BUCKET = "dispute-evidence";
const ALLOWED_EVIDENCE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024;

type Review = {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type Notice = { tone: "success" | "error"; text: string } | null;

function memberName(member: PanelTeamMember) {
  return publicDisplayName(member, "Freelancer");
}

function formatDate(value: string | null) {
  if (!value) return "Belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(
    new Date(value)
  );
}

const INPUT_CLASS = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm";
const PRIMARY_BUTTON =
  "inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:opacity-50";
const SECONDARY_BUTTON =
  "inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50";

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-gray-900">
        {icon}
        <h2 className="font-semibold">{title}</h2>
      </div>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function ProjectOperationsPanel({
  project,
  teamMembers,
  milestones,
  viewerRole,
  currentUserId,
  onChanged,
}: {
  project: PanelProject;
  teamMembers: PanelTeamMember[];
  milestones: Milestone[];
  viewerRole: "client" | "freelancer";
  currentUserId: string;
  onChanged: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const isClient = viewerRole === "client";

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [extensions, setExtensions] = useState<ExtensionRequest[]>([]);
  const [cancellations, setCancellations] = useState<CancellationRequest[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [evidence, setEvidence] = useState<DisputeEvidence[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [extensionDrafts, setExtensionDrafts] = useState<Record<string, { date: string; reason: string }>>({});
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeDraft, setDisputeDraft] = useState({ milestoneId: "", reason: "quality", description: "" });
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, { note?: string; file?: File | null }>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; comment: string }>>({});

  const projectStatus = project.status ?? "open";
  const isTerminal = projectStatus === "completed" || projectStatus === "cancelled";
  const isInProgress = projectStatus === "in_progress";

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const [extensionResult, cancellationResult, disputeResult, reviewResult] = await Promise.all([
        supabase
          .from("milestone_extension_requests")
          .select("id, milestone_id, requested_by, previous_due_date, requested_due_date, reason, status, response_note, created_at")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("project_cancellation_requests")
          .select("id, requested_by, requester_role, reason, status, response_note, created_at")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("disputes")
          .select("id, milestone_id, opened_by, reason, description, status, resolution, resolution_outcome, created_at")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("reviews")
          .select("id, reviewer_id, reviewee_id, rating, comment, created_at")
          .eq("project_id", project.id),
      ]);

      if (!active) return;

      if (extensionResult.error || cancellationResult.error || disputeResult.error || reviewResult.error) {
        setNotice({ tone: "error", text: "Bazı bilgiler yüklenemedi. Lütfen sayfayı yenile." });
      }

      setExtensions((extensionResult.data ?? []) as ExtensionRequest[]);
      setCancellations((cancellationResult.data ?? []) as CancellationRequest[]);
      const disputeRows = (disputeResult.data ?? []) as Dispute[];
      setDisputes(disputeRows);
      setReviews((reviewResult.data ?? []) as Review[]);

      const disputeIds = disputeRows.map((d) => d.id);
      if (disputeIds.length > 0) {
        const { data: evidenceRows } = await supabase
          .from("dispute_evidence")
          .select("id, dispute_id, note, file_path, file_name")
          .in("dispute_id", disputeIds)
          .order("created_at", { ascending: true });
        if (active) setEvidence((evidenceRows ?? []) as DisputeEvidence[]);
      } else {
        setEvidence([]);
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [supabase, project.id, reloadKey]);

  async function run(key: string, action: () => PromiseLike<{ error: { code?: string; message?: string } | null }>, successText: string, failText: string, after?: () => void) {
    setBusy(key);
    setNotice(null);
    const { error } = await action();
    setBusy(null);

    if (error) {
      setNotice({ tone: "error", text: friendlyRpcError(error, failText) });
      return false;
    }

    setNotice({ tone: "success", text: successText });
    after?.();
    setReloadKey((current) => current + 1);
    onChanged();
    return true;
  }

  const pendingCancellation = cancellations.find((c) => c.status === "pending") ?? null;
  const openDisputes = disputes.filter((d) => d.status === "open" || d.status === "under_review");

  const evidenceByDispute = useMemo(() => {
    const map: Record<string, DisputeEvidence[]> = {};
    for (const ev of evidence) {
      (map[ev.dispute_id] ??= []).push(ev);
    }
    return map;
  }, [evidence]);

  async function downloadEvidenceFile(ev: DisputeEvidence) {
    if (!ev.file_path) return;
    const { data, error } = await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrl(ev.file_path, 60 * 10);
    if (error || !data?.signedUrl) {
      setNotice({ tone: "error", text: "Dosya açılamadı. Lütfen tekrar dene." });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function submitEvidence(disputeId: string) {
    const draft = evidenceDrafts[disputeId] ?? {};
    const note = (draft.note ?? "").trim();
    const file = draft.file ?? null;

    if (!note && !file) return;

    if (file) {
      if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
        setNotice({ tone: "error", text: "Desteklenmeyen dosya türü. JPG, PNG, WEBP, PDF veya DOCX yükle." });
        return;
      }
      if (file.size > MAX_EVIDENCE_SIZE) {
        setNotice({ tone: "error", text: "Dosya 10 MB'dan büyük olamaz." });
        return;
      }
    }

    setBusy(`ev-${disputeId}`);
    setNotice(null);

    let filePath: string | null = null;

    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      filePath = `${disputeId}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage.from(EVIDENCE_BUCKET).upload(filePath, file, {
        contentType: file.type,
      });

      if (uploadError) {
        setBusy(null);
        setNotice({ tone: "error", text: friendlyRpcError(uploadError, "Dosya yüklenemedi. Lütfen tekrar dene.") });
        return;
      }
    }

    const { error } = await supabase.rpc("add_dispute_evidence", {
      p_dispute_id: disputeId,
      p_note: note || null,
      p_project_file_id: null,
      p_file_path: filePath,
      p_file_name: file?.name ?? null,
      p_file_type: file?.type ?? null,
      p_file_size: file?.size ?? null,
    });

    setBusy(null);

    if (error) {
      setNotice({ tone: "error", text: friendlyRpcError(error, "Kanıt eklenemedi.") });
      return;
    }

    setEvidenceDrafts((c) => ({ ...c, [disputeId]: { note: "", file: null } }));
    setNotice({ tone: "success", text: "Kanıt uyuşmazlığa eklendi." });
    setReloadKey((key) => key + 1);
  }

  const myExtensionEligible = (milestone: Milestone) =>
    !isClient &&
    isInProgress &&
    (milestone.status === "active" || milestone.status === "revision") &&
    (milestone.freelancer_id === null || milestone.freelancer_id === currentUserId);

  const timedMilestones = milestones.filter((m) => m.status !== "approved" && m.due_date);

  const reviewTargets = isClient
    ? teamMembers.map((member) => ({ id: member.id, label: `${memberName(member)} (${member.memberRole})` }))
    : [{ id: project.client_id, label: "Proje sahibi" }];

  return (
    <div className="space-y-5">
      {notice && (
        <div
          className={`rounded-xl p-4 text-sm ${
            notice.tone === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Yükleniyor...
        </div>
      )}

      {/* SÜRE / TERMİN */}
      <SectionCard
        icon={<CalendarClock size={18} />}
        title="Teslim tarihleri ve süre uzatma"
        description={
          isClient
            ? "Geciken aşamaları görebilir, freelancer'ın süre uzatma taleplerini kabul veya reddedebilirsin."
            : "Teslim tarihine yetişemeyeceksen client'a gerekçeyle süre uzatma talebi gönderebilirsin."
        }
      >
        {timedMilestones.length === 0 ? (
          <p className="text-sm text-gray-500">Teslim tarihi tanımlı, devam eden bir aşama yok.</p>
        ) : (
          <ul className="space-y-3">
            {timedMilestones.map((milestone) => {
              const status = getDeadlineStatus({ dueDate: milestone.due_date, status: milestone.status });
              const pending = extensions.find((e) => e.milestone_id === milestone.id && e.status === "pending");
              const draft = extensionDrafts[milestone.id] ?? { date: "", reason: "" };

              return (
                <li key={milestone.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-gray-900">{milestone.title}</p>
                    <span className="text-sm text-gray-500">
                      Teslim: {formatDate(milestone.due_date)}
                      {status && (
                        <span
                          className={`ml-2 rounded-full px-2.5 py-1 text-xs font-medium ${
                            status === "overdue"
                              ? "bg-red-50 text-red-700"
                              : status === "due_soon"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-green-50 text-green-700"
                          }`}
                        >
                          {DEADLINE_STATUS_LABEL[status]}
                        </span>
                      )}
                    </span>
                  </div>

                  {pending && (
                    <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                      <p>
                        Yeni teslim tarihi talebi: <strong>{formatDate(pending.requested_due_date)}</strong>
                      </p>
                      <p className="mt-1">Gerekçe: {pending.reason}</p>
                      {isClient ? (
                        <div className="mt-3 space-y-2">
                          <input
                            value={responseNotes[pending.id] ?? ""}
                            onChange={(e) => setResponseNotes((c) => ({ ...c, [pending.id]: e.target.value }))}
                            placeholder="Yanıt notu (opsiyonel)"
                            className={INPUT_CLASS}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy === `ext-${pending.id}`}
                              onClick={() =>
                                void run(
                                  `ext-${pending.id}`,
                                  () =>
                                    supabase.rpc("respond_milestone_extension", {
                                      p_request_id: pending.id,
                                      p_accept: true,
                                      p_note: responseNotes[pending.id] ?? null,
                                    }),
                                  "Süre uzatma talebi kabul edildi.",
                                  "Talebe yanıt verilemedi."
                                )
                              }
                              className={PRIMARY_BUTTON}
                            >
                              Kabul Et
                            </button>
                            <button
                              type="button"
                              disabled={busy === `ext-${pending.id}`}
                              onClick={() =>
                                void run(
                                  `ext-${pending.id}`,
                                  () =>
                                    supabase.rpc("respond_milestone_extension", {
                                      p_request_id: pending.id,
                                      p_accept: false,
                                      p_note: responseNotes[pending.id] ?? null,
                                    }),
                                  "Süre uzatma talebi reddedildi.",
                                  "Talebe yanıt verilemedi."
                                )
                              }
                              className={SECONDARY_BUTTON}
                            >
                              Reddet
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs">Client yanıtı bekleniyor.</p>
                      )}
                    </div>
                  )}

                  {!pending && myExtensionEligible(milestone) && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(e) =>
                          setExtensionDrafts((c) => ({ ...c, [milestone.id]: { ...draft, date: e.target.value } }))
                        }
                        className={INPUT_CLASS}
                      />
                      <input
                        value={draft.reason}
                        onChange={(e) =>
                          setExtensionDrafts((c) => ({ ...c, [milestone.id]: { ...draft, reason: e.target.value } }))
                        }
                        placeholder="Süre uzatma gerekçesi"
                        className={INPUT_CLASS}
                      />
                      <button
                        type="button"
                        disabled={busy === `req-${milestone.id}` || !draft.date || draft.reason.trim().length < 5}
                        onClick={() =>
                          void run(
                            `req-${milestone.id}`,
                            () =>
                              supabase.rpc("request_milestone_extension", {
                                p_milestone_id: milestone.id,
                                p_new_due_date: draft.date,
                                p_reason: draft.reason.trim(),
                              }),
                            "Süre uzatma talebin client'a iletildi.",
                            "Süre uzatma talebi gönderilemedi.",
                            () => setExtensionDrafts((c) => ({ ...c, [milestone.id]: { date: "", reason: "" } }))
                          )
                        }
                        className={PRIMARY_BUTTON}
                      >
                        {busy === `req-${milestone.id}` && <Loader2 size={15} className="animate-spin" />}
                        Süre İste
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {extensions.filter((e) => e.status !== "pending").length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Geçmiş talepler</p>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
              {extensions
                .filter((e) => e.status !== "pending")
                .map((e) => (
                  <li key={e.id}>
                    {formatDate(e.requested_due_date)} · {REQUEST_STATUS_LABEL[e.status] ?? e.status}
                    {e.response_note ? ` — ${e.response_note}` : ""}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </SectionCard>

      {/* İPTAL */}
      <SectionCard
        icon={<Ban size={18} />}
        title="Proje iptali"
        description="Tamamlanan projeler iptal edilemez. Devam eden projede iptal, karşı tarafın onayıyla gerçekleşir."
      >
        {projectStatus === "cancelled" && (
          <p className="rounded-xl bg-gray-100 p-4 text-sm text-gray-700">Bu proje iptal edildi.</p>
        )}
        {projectStatus === "completed" && (
          <p className="rounded-xl bg-gray-100 p-4 text-sm text-gray-700">
            Bu proje tamamlandı; iptal edilemez. Bir sorun yaşadıysan uyuşmazlık açabilirsin.
          </p>
        )}

        {pendingCancellation && (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">
              {pendingCancellation.requested_by === currentUserId
                ? "İptal talebin karşı tarafın yanıtını bekliyor."
                : "Bu proje için bir iptal talebi var."}
            </p>
            <p className="mt-1">Gerekçe: {pendingCancellation.reason}</p>

            {pendingCancellation.requested_by === currentUserId ? (
              <button
                type="button"
                disabled={busy === "cancel-withdraw"}
                onClick={() =>
                  void run(
                    "cancel-withdraw",
                    () => supabase.rpc("withdraw_project_cancellation", { p_request_id: pendingCancellation.id }),
                    "İptal talebi geri çekildi.",
                    "İptal talebi geri çekilemedi."
                  )
                }
                className={`${SECONDARY_BUTTON} mt-3`}
              >
                Talebi Geri Çek
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <input
                  value={responseNotes[pendingCancellation.id] ?? ""}
                  onChange={(e) => setResponseNotes((c) => ({ ...c, [pendingCancellation.id]: e.target.value }))}
                  placeholder="Yanıt notu (opsiyonel)"
                  className={INPUT_CLASS}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === "cancel-respond"}
                    onClick={() => {
                      if (!window.confirm("İptal talebini kabul etmek istediğine emin misin?")) return;
                      void run(
                        "cancel-respond",
                        () =>
                          supabase.rpc("respond_project_cancellation", {
                            p_request_id: pendingCancellation.id,
                            p_accept: true,
                            p_note: responseNotes[pendingCancellation.id] ?? null,
                          }),
                        "İptal talebi kabul edildi.",
                        "Talebe yanıt verilemedi."
                      );
                    }}
                    className={PRIMARY_BUTTON}
                  >
                    İptali Kabul Et
                  </button>
                  <button
                    type="button"
                    disabled={busy === "cancel-respond"}
                    onClick={() =>
                      void run(
                        "cancel-respond",
                        () =>
                          supabase.rpc("respond_project_cancellation", {
                            p_request_id: pendingCancellation.id,
                            p_accept: false,
                            p_note: responseNotes[pendingCancellation.id] ?? null,
                          }),
                        "İptal talebi reddedildi.",
                        "Talebe yanıt verilemedi."
                      )
                    }
                    className={SECONDARY_BUTTON}
                  >
                    Reddet
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!isTerminal && !pendingCancellation && (
          <>
            {!showCancelForm ? (
              <button type="button" onClick={() => setShowCancelForm(true)} className={SECONDARY_BUTTON}>
                İptal Talebi Oluştur
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="İptal nedenini en az 10 karakterle açıkla"
                  className={INPUT_CLASS}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === "cancel-create" || cancelReason.trim().length < 10}
                    onClick={() =>
                      void run(
                        "cancel-create",
                        () =>
                          supabase.rpc("request_project_cancellation", {
                            p_project_id: project.id,
                            p_reason: cancelReason.trim(),
                          }),
                        "İptal talebin oluşturuldu.",
                        "İptal talebi oluşturulamadı.",
                        () => {
                          setCancelReason("");
                          setShowCancelForm(false);
                        }
                      )
                    }
                    className={PRIMARY_BUTTON}
                  >
                    {busy === "cancel-create" && <Loader2 size={15} className="animate-spin" />}
                    Talebi Gönder
                  </button>
                  <button type="button" onClick={() => setShowCancelForm(false)} className={SECONDARY_BUTTON}>
                    Vazgeç
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {cancellations.filter((c) => c.status !== "pending").length > 0 && (
          <ul className="space-y-1.5 text-sm text-gray-600">
            {cancellations
              .filter((c) => c.status !== "pending")
              .map((c) => (
                <li key={c.id}>
                  {formatDate(c.created_at)} · {REQUEST_STATUS_LABEL[c.status] ?? c.status} — {c.reason}
                </li>
              ))}
          </ul>
        )}
      </SectionCard>

      {/* UYUŞMAZLIK */}
      <SectionCard
        icon={<Scale size={18} />}
        title="Uyuşmazlık merkezi"
        description="Taraflar anlaşamazsa CollaCrew ekibi proje, mesaj, teslim ve aşama geçmişini inceleyerek çözüm sürecini yönetir."
      >
        {disputes.length === 0 && <p className="text-sm text-gray-500">Bu proje için açılmış bir uyuşmazlık yok.</p>}

        {disputes.map((dispute) => (
          <div key={dispute.id} className="rounded-xl border border-gray-100 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-gray-900">{DISPUTE_REASON_LABEL[dispute.reason] ?? dispute.reason}</p>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                {DISPUTE_STATUS_LABEL[dispute.status] ?? dispute.status}
              </span>
            </div>
            <p className="mt-2 text-gray-600">{dispute.description}</p>
            <p className="mt-1 text-xs text-gray-400">
              {formatDate(dispute.created_at)} ·{" "}
              {dispute.opened_by === currentUserId ? "Sen açtın" : "Karşı taraf açtı"}
            </p>

            {dispute.resolution && (
              <div className="mt-3 rounded-lg bg-green-50 p-3 text-green-800">
                <p className="text-xs font-medium">
                  Çözüm{dispute.resolution_outcome ? ` · ${DISPUTE_OUTCOME_LABEL[dispute.resolution_outcome]}` : ""}
                </p>
                {dispute.resolution}
              </div>
            )}

            {evidenceByDispute[dispute.id]?.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Kanıtlar</p>
                {evidenceByDispute[dispute.id].map((ev) => (
                  <div key={ev.id} className="text-sm text-gray-600">
                    {ev.note && <p>{ev.note}</p>}
                    {ev.file_path && (
                      <button
                        type="button"
                        onClick={() => void downloadEvidenceFile(ev)}
                        className="inline-flex items-center gap-1.5 font-medium text-gray-700 underline-offset-2 hover:underline"
                      >
                        <FileText size={13} />
                        {ev.file_name ?? "Dosya"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(dispute.status === "open" || dispute.status === "under_review") && (
              <div className="mt-3 space-y-2">
                <input
                  value={evidenceDrafts[dispute.id]?.note ?? ""}
                  onChange={(e) =>
                    setEvidenceDrafts((c) => ({ ...c, [dispute.id]: { ...c[dispute.id], note: e.target.value } }))
                  }
                  placeholder="Kanıt / ek açıklama ekle"
                  className={INPUT_CLASS}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.docx"
                    onChange={(e) =>
                      setEvidenceDrafts((c) => ({
                        ...c,
                        [dispute.id]: { ...c[dispute.id], file: e.target.files?.[0] ?? null },
                      }))
                    }
                    className="max-w-[220px] text-xs text-gray-500"
                  />
                  <button
                    type="button"
                    disabled={
                      busy === `ev-${dispute.id}` ||
                      (!(evidenceDrafts[dispute.id]?.note ?? "").trim() && !evidenceDrafts[dispute.id]?.file)
                    }
                    onClick={() => void submitEvidence(dispute.id)}
                    className={SECONDARY_BUTTON}
                  >
                    {busy === `ev-${dispute.id}` && <Loader2 size={15} className="animate-spin" />}
                    Ekle
                  </button>
                </div>
                <p className="text-xs text-gray-400">JPG, PNG, WEBP, PDF veya DOCX — en fazla 10 MB.</p>
              </div>
            )}
          </div>
        ))}

        {projectStatus !== "open" && openDisputes.every((d) => d.opened_by !== currentUserId) && (
          <>
            {!showDisputeForm ? (
              <button type="button" onClick={() => setShowDisputeForm(true)} className={SECONDARY_BUTTON}>
                <AlertTriangle size={15} /> Uyuşmazlık Aç
              </button>
            ) : (
              <div className="space-y-2 rounded-xl border border-gray-100 p-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={disputeDraft.reason}
                    onChange={(e) => setDisputeDraft((d) => ({ ...d, reason: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    {Object.entries(DISPUTE_REASON_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={disputeDraft.milestoneId}
                    onChange={(e) => setDisputeDraft((d) => ({ ...d, milestoneId: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="">Tüm proje</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={disputeDraft.description}
                  onChange={(e) => setDisputeDraft((d) => ({ ...d, description: e.target.value }))}
                  rows={4}
                  placeholder="Yaşanan sorunu en az 20 karakterle anlat"
                  className={INPUT_CLASS}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === "dispute-open" || disputeDraft.description.trim().length < 20}
                    onClick={() =>
                      void run(
                        "dispute-open",
                        () =>
                          supabase.rpc("open_dispute", {
                            p_project_id: project.id,
                            p_milestone_id: disputeDraft.milestoneId || null,
                            p_reason: disputeDraft.reason,
                            p_description: disputeDraft.description.trim(),
                          }),
                        "Uyuşmazlığın CollaCrew ekibine iletildi.",
                        "Uyuşmazlık açılamadı.",
                        () => {
                          setDisputeDraft({ milestoneId: "", reason: "quality", description: "" });
                          setShowDisputeForm(false);
                        }
                      )
                    }
                    className={PRIMARY_BUTTON}
                  >
                    {busy === "dispute-open" && <Loader2 size={15} className="animate-spin" />}
                    Uyuşmazlığı Gönder
                  </button>
                  <button type="button" onClick={() => setShowDisputeForm(false)} className={SECONDARY_BUTTON}>
                    Vazgeç
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* DEĞERLENDİRME */}
      <SectionCard
        icon={<Star size={18} />}
        title="Değerlendirme"
        description="Yalnızca tamamlanan projeler değerlendirilebilir. Her proje için bir kişiyi bir kez değerlendirebilirsin."
      >
        {projectStatus !== "completed" ? (
          <p className="text-sm text-gray-500">Proje tamamlandığında değerlendirme yapabilirsin.</p>
        ) : (
          reviewTargets.map((target) => {
            const mine = reviews.find((r) => r.reviewer_id === currentUserId && r.reviewee_id === target.id);
            const received = reviews.find((r) => r.reviewer_id === target.id && r.reviewee_id === currentUserId);
            const draft = reviewDrafts[target.id] ?? { rating: 0, comment: "" };

            return (
              <div key={target.id} className="rounded-xl border border-gray-100 p-4 text-sm">
                <p className="font-medium text-gray-900">{target.label}</p>

                {mine ? (
                  <p className="mt-2 text-gray-600">
                    Değerlendirmen: {"★".repeat(mine.rating)}
                    {"☆".repeat(5 - mine.rating)}
                    {mine.comment ? ` — ${mine.comment}` : ""}
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-1" role="radiogroup" aria-label="Puan">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={draft.rating === value}
                          onClick={() => setReviewDrafts((c) => ({ ...c, [target.id]: { ...draft, rating: value } }))}
                          className={`text-2xl leading-none ${value <= draft.rating ? "text-amber-500" : "text-gray-300"}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={draft.comment}
                      onChange={(e) => setReviewDrafts((c) => ({ ...c, [target.id]: { ...draft, comment: e.target.value } }))}
                      rows={3}
                      maxLength={2000}
                      placeholder="Deneyimini kısaca yaz (opsiyonel)"
                      className={INPUT_CLASS}
                    />
                    <button
                      type="button"
                      disabled={busy === `review-${target.id}` || draft.rating < 1}
                      onClick={() =>
                        void run(
                          `review-${target.id}`,
                          () =>
                            supabase.rpc("submit_review", {
                              p_project_id: project.id,
                              p_reviewee_id: target.id,
                              p_rating: draft.rating,
                              p_comment: draft.comment.trim() || null,
                            }),
                          "Değerlendirmen kaydedildi.",
                          "Değerlendirme kaydedilemedi."
                        )
                      }
                      className={PRIMARY_BUTTON}
                    >
                      {busy === `review-${target.id}` && <Loader2 size={15} className="animate-spin" />}
                      Değerlendirmeyi Gönder
                    </button>
                  </div>
                )}

                {received && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 text-gray-600">
                    <p>
                      Sana verilen değerlendirme: {"★".repeat(received.rating)}
                      {"☆".repeat(5 - received.rating)}
                      {received.comment ? ` — ${received.comment}` : ""}
                    </p>
                    <ReportButton targetType="review" targetId={received.id} label="Değerlendirmeyi Şikayet Et" className="mt-2" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </SectionCard>

      <div className="flex justify-end">
        <ReportButton targetType="project" targetId={project.id} label="Projeyi Şikayet Et" />
      </div>
    </div>
  );
}
