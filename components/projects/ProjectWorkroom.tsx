"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  Loader2,
  MessageCircle,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import ProjectFiles from "@/components/projects/ProjectFiles";
import {
  activateMilestone,
  createMilestone,
  deleteMilestone,
  fetchMilestoneEvents,
  fetchMilestones,
  reviewMilestone,
  submitMilestone,
  type Milestone,
  type MilestoneEvent,
} from "@/lib/projects/milestones";
import { notifyUsers } from "@/lib/notifications";

export type WorkroomTeamMember = {
  teamMemberId: string;
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  memberRole: string;
  proposalId: string | null;
};

export type WorkroomProject = {
  id: string;
  client_id: string;
  title: string;
  budget: number | null;
  status: string | null;
  deadline: string | null;
};

type Tab = "overview" | "milestones" | "team" | "files" | "messages" | "deliveries";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Genel Bakış" },
  { id: "milestones", label: "Aşamalar" },
  { id: "team", label: "Ekip" },
  { id: "files", label: "Dosyalar" },
  { id: "messages", label: "Mesajlar" },
  { id: "deliveries", label: "Teslimler" },
];

const MILESTONE_STATUS_LABEL: Record<Milestone["status"], string> = {
  pending: "Bekliyor",
  active: "Aktif",
  submitted: "Teslim edildi",
  in_review: "İncelemede",
  revision: "Revizyon istendi",
  approved: "Tamamlandı",
};

const MILESTONE_STATUS_CLASS: Record<Milestone["status"], string> = {
  pending: "bg-gray-100 text-gray-600",
  active: "bg-blue-50 text-blue-700",
  submitted: "bg-amber-50 text-amber-700",
  in_review: "bg-amber-50 text-amber-700",
  revision: "bg-red-50 text-red-700",
  approved: "bg-green-50 text-green-700",
};

const EVENT_LABEL: Record<MilestoneEvent["event_type"], string> = {
  submitted: "teslim etti",
  revision_requested: "revizyon istedi",
  resubmitted: "yeniden teslim etti",
  approved: "onayladı",
};

function formatDate(value: string | null) {
  if (!value) return "Belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(
    new Date(value)
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getFullName(member: WorkroomTeamMember) {
  const name = [member.first_name, member.last_name].filter(Boolean).join(" ").trim();
  return name || "Freelancer";
}

function actorLabel(event: MilestoneEvent, teamMembers: WorkroomTeamMember[]) {
  if (event.actor_role === "client") return "Client";
  const member = teamMembers.find((m) => m.id === event.actor_id);
  return member ? getFullName(member) : "Freelancer";
}

export default function ProjectWorkroom({
  project,
  teamMembers,
  viewerRole,
  messagesBasePath,
  onProjectCompleted,
}: {
  project: WorkroomProject;
  teamMembers: WorkroomTeamMember[];
  viewerRole: "client" | "freelancer";
  /** Ör. "/client/messages" ya da "/freelancers/messages" */
  messagesBasePath: string;
  onProjectCompleted?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const isClient = viewerRole === "client";

  const [tab, setTab] = useState<Tab>("overview");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [events, setEvents] = useState<MilestoneEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newBudget, setNewBudget] = useState("");

  const [deliveryDrafts, setDeliveryDrafts] = useState<Record<string, string>>({});
  const [revisionDrafts, setRevisionDrafts] = useState<Record<string, string>>({});
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [filesOpenMilestoneId, setFilesOpenMilestoneId] = useState<string | null>(null);

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await fetchMilestones(supabase, project.id);
    if (loadError) {
      setError("Aşamalar yüklenemedi.");
      setLoading(false);
      return;
    }

    const loaded = (data ?? []) as Milestone[];
    setMilestones(loaded);

    const { data: eventData, error: eventsError } = await fetchMilestoneEvents(
      supabase,
      loaded.map((m) => m.id)
    );
    if (!eventsError) {
      setEvents((eventData ?? []) as MilestoneEvent[]);
    }

    setLoading(false);
  }, [supabase, project.id]);

  useEffect(() => {
    void loadMilestones();
  }, [loadMilestones]);

  const approvedCount = milestones.filter((m) => m.status === "approved").length;
  const progress = milestones.length > 0 ? Math.round((approvedCount / milestones.length) * 100) : 0;

  function eventsFor(milestoneId: string) {
    return events.filter((e) => e.milestone_id === milestoneId);
  }

  function revisionCountFor(milestoneId: string) {
    return eventsFor(milestoneId).filter((e) => e.event_type === "revision_requested").length;
  }

  async function handleCreateMilestone() {
    if (!newTitle.trim()) {
      setError("Aşama başlığı gerekli.");
      return;
    }

    setError("");
    const isFirst = milestones.length === 0;

    const { error: createError } = await createMilestone(supabase, {
      projectId: project.id,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      dueDate: newDueDate || null,
      budget: newBudget ? Number(newBudget) : null,
      sortOrder: milestones.length,
      status: isFirst ? "active" : "pending",
    });

    if (createError) {
      setError("Aşama oluşturulamadı.");
      return;
    }

    setNewTitle("");
    setNewDescription("");
    setNewDueDate("");
    setNewBudget("");
    setShowCreate(false);
    await loadMilestones();
  }

  async function handleDeleteMilestone(milestone: Milestone) {
    if (milestone.status !== "pending" && milestone.status !== "active") return;
    if (!window.confirm("Bu aşamayı silmek istediğinizden emin misiniz?")) return;

    setBusyId(milestone.id);
    const { error: deleteError } = await deleteMilestone(supabase, milestone.id);
    if (deleteError) setError("Aşama silinemedi.");
    setBusyId(null);
    await loadMilestones();
  }

  async function handleActivateNext(milestone: Milestone) {
    setBusyId(milestone.id);
    const { error: activateError } = await activateMilestone(supabase, milestone.id);
    if (activateError) setError("Aşama başlatılamadı.");
    setBusyId(null);
    await loadMilestones();
  }

  async function handleSubmitDelivery(milestone: Milestone) {
    const description = (deliveryDrafts[milestone.id] ?? "").trim();
    if (!description) {
      setError("Teslim açıklaması gerekli.");
      return;
    }

    setBusyId(milestone.id);
    setError("");

    const fromStatus = milestone.status === "revision" ? "revision" : "active";
    const { error: submitError } = await submitMilestone(supabase, milestone.id, fromStatus, description);

    if (submitError) {
      setError("Teslim gönderilemedi.");
      setBusyId(null);
      return;
    }

    await notifyUsers(supabase, [
      {
        userId: project.client_id,
        type: "milestone_submitted",
        title: "Yeni teslim var",
        message: `"${milestone.title}" aşaması teslim edildi.`,
        link: `/client/projects/${project.id}`,
      },
    ]);

    setDeliveryDrafts((current) => ({ ...current, [milestone.id]: "" }));
    setBusyId(null);
    await loadMilestones();
  }

  async function handleReview(milestone: Milestone, decision: "approved" | "revision") {
    if (decision === "revision" && !(revisionDrafts[milestone.id] ?? "").trim()) {
      setError("Revizyon isteği için bir not yazman gerekiyor.");
      return;
    }

    setBusyId(milestone.id);
    setError("");

    const notes = decision === "revision" ? (revisionDrafts[milestone.id] ?? "").trim() : undefined;
    const { error: reviewError } = await reviewMilestone(supabase, milestone.id, decision, notes);

    if (reviewError) {
      setError("Aşama güncellenemedi.");
      setBusyId(null);
      return;
    }

    await notifyUsers(
      supabase,
      teamMembers.map((member) => ({
        userId: member.id,
        type: decision === "approved" ? "milestone_approved" : "milestone_revision",
        title: decision === "approved" ? "Aşama onaylandı" : "Revizyon istendi",
        message:
          decision === "approved"
            ? `"${milestone.title}" aşaması onaylandı.`
            : `"${milestone.title}" aşaması için revizyon istendi.`,
        link: `/freelancers/projects/${project.id}`,
      }))
    );

    if (decision === "approved") {
      const remaining = milestones.filter((m) => m.id !== milestone.id);
      const nextPending = remaining
        .filter((m) => m.status === "pending")
        .sort((a, b) => a.sort_order - b.sort_order)[0];

      if (nextPending) {
        await activateMilestone(supabase, nextPending.id);
      } else {
        const allOthersApproved = remaining.every((m) => m.status === "approved");
        if (allOthersApproved) {
          await supabase.from("projects").update({ status: "completed" }).eq("id", project.id);

          await notifyUsers(
            supabase,
            teamMembers.map((member) => ({
              userId: member.id,
              type: "project_completed",
              title: "Proje tamamlandı",
              message: `"${project.title}" projesi tamamlandı.`,
              link: `/freelancers/projects/${project.id}`,
            }))
          );

          onProjectCompleted?.();
        }
      }
    } else {
      setRevisionDrafts((current) => ({ ...current, [milestone.id]: "" }));
    }

    setBusyId(null);
    await loadMilestones();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 rounded-xl bg-gray-100 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {tab === "overview" && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Bütçe</p>
            <p className="mt-1 font-semibold text-gray-900">{formatCurrency(Number(project.budget ?? 0))}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Teslim tarihi</p>
            <p className="mt-1 font-semibold text-gray-900">{formatDate(project.deadline)}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Ekip</p>
            <p className="mt-1 font-semibold text-gray-900">{teamMembers.length} freelancer</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Aşama ilerlemesi</p>
            <p className="mt-1 font-semibold text-gray-900">
              {approvedCount}/{milestones.length || 0}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-black" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </section>
      )}

      {tab === "milestones" && (
        <section className="space-y-4">
          {isClient && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowCreate((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                <Plus size={16} />
                Aşama ekle
              </button>
            </div>
          )}

          {isClient && showCreate && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Aşama başlığı"
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                />
                <input
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  placeholder="Bütçe (opsiyonel)"
                  type="number"
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                />
                <input
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  type="date"
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                />
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Açıklama (opsiyonel)"
                  className="sm:col-span-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  rows={3}
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateMilestone()}
                  className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white"
                >
                  Kaydet
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              Aşamalar yükleniyor...
            </div>
          ) : milestones.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
              {isClient ? "Henüz aşama eklenmedi." : "Bu proje için henüz aşama tanımlanmadı."}
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((milestone) => {
                const history = eventsFor(milestone.id);
                const revisionCount = revisionCountFor(milestone.id);
                const isExpanded = expandedMilestoneId === milestone.id;

                return (
                  <div key={milestone.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${MILESTONE_STATUS_CLASS[milestone.status]}`}
                          >
                            {MILESTONE_STATUS_LABEL[milestone.status]}
                          </span>
                          {revisionCount > 0 && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">
                              {revisionCount} revizyon
                            </span>
                          )}
                        </div>
                        {milestone.description && (
                          <p className="mt-2 max-w-2xl text-sm text-gray-600">{milestone.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                          {milestone.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock3 size={13} /> {formatDate(milestone.due_date)}
                            </span>
                          )}
                          {milestone.budget !== null && <span>{formatCurrency(Number(milestone.budget))}</span>}
                        </div>
                      </div>

                      {isClient && milestone.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteMilestone(milestone)}
                          disabled={busyId === milestone.id}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Aşamayı sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* GÜNCEL TESLİM / REVİZYON DURUMU */}
                    {milestone.deliverable_description && (
                      <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                        <p className="mb-1 text-xs font-medium text-gray-500">
                          {milestone.status === "revision" ? "Son teslim (revizyon bekliyor)" : "Güncel teslim"}
                        </p>
                        {milestone.deliverable_description}
                      </div>
                    )}

                    {milestone.revision_notes && milestone.status === "revision" && (
                      <div className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                        <p className="mb-1 text-xs font-medium text-red-500">Revizyon notu</p>
                        {milestone.revision_notes}
                      </div>
                    )}

                    {/* TESLİM / REVİZYON GEÇMİŞİ */}
                    {history.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-3">
                        <button
                          type="button"
                          onClick={() => setExpandedMilestoneId(isExpanded ? null : milestone.id)}
                          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          Teslim geçmişi ({history.length})
                        </button>
                        {isExpanded && (
                          <ol className="mt-3 space-y-2 border-l-2 border-gray-100 pl-4">
                            {history.map((event) => (
                              <li key={event.id} className="text-sm text-gray-600">
                                <span className="font-medium text-gray-900">{formatDateTime(event.created_at)}</span>
                                {" — "}
                                {actorLabel(event, teamMembers)} {EVENT_LABEL[event.event_type]}
                                {event.note && (
                                  <p className="mt-1 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">{event.note}</p>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}

                    {/* FREELANCER: TESLİM ET */}
                    {!isClient && (milestone.status === "active" || milestone.status === "revision") && (
                      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                        <textarea
                          value={deliveryDrafts[milestone.id] ?? ""}
                          onChange={(e) =>
                            setDeliveryDrafts((current) => ({ ...current, [milestone.id]: e.target.value }))
                          }
                          placeholder="Teslim açıklaması yazın..."
                          rows={3}
                          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFilesOpenMilestoneId((current) => (current === milestone.id ? null : milestone.id))
                          }
                          className="text-sm font-medium text-gray-600 underline-offset-2 hover:underline"
                        >
                          {filesOpenMilestoneId === milestone.id ? "Dosyaları gizle" : "Dosya ekle"}
                        </button>
                        {filesOpenMilestoneId === milestone.id && (
                          <ProjectFiles projectId={project.id} milestoneId={milestone.id} canManage />
                        )}
                        <div>
                          <button
                            type="button"
                            onClick={() => void handleSubmitDelivery(milestone)}
                            disabled={busyId === milestone.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
                          >
                            {busyId === milestone.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                            Teslim Et
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CLIENT: KABUL ET / REVİZYON İSTE */}
                    {isClient && (milestone.status === "submitted" || milestone.status === "in_review") && (
                      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                        <ProjectFiles projectId={project.id} milestoneId={milestone.id} canManage={false} />
                        <textarea
                          value={revisionDrafts[milestone.id] ?? ""}
                          onChange={(e) =>
                            setRevisionDrafts((current) => ({ ...current, [milestone.id]: e.target.value }))
                          }
                          placeholder="Revizyon notu (revizyon isteniyorsa zorunlu)"
                          rows={2}
                          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleReview(milestone, "approved")}
                            disabled={busyId === milestone.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
                          >
                            <CheckCircle2 size={16} />
                            Kabul Et
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReview(milestone, "revision")}
                            disabled={busyId === milestone.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                          >
                            <RotateCcw size={16} />
                            Revizyon İste
                          </button>
                        </div>
                      </div>
                    )}

                    {isClient &&
                      milestone.status === "pending" &&
                      milestones.every(
                        (m) => !["active", "submitted", "in_review", "revision"].includes(m.status)
                      ) && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => void handleActivateNext(milestone)}
                            disabled={busyId === milestone.id}
                            className="text-sm font-medium text-gray-700 underline-offset-2 hover:underline"
                          >
                            Bu aşamayı başlat
                          </button>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "team" && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-gray-900">
            <Users size={18} />
            <h2 className="font-semibold">Proje ekibi</h2>
          </div>
          {teamMembers.length === 0 ? (
            <p className="text-sm text-gray-500">Bu projeye ait aktif ekip üyesi bulunamadı.</p>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.teamMemberId}
                  className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={getFullName(member)} className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                        {getFullName(member).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{getFullName(member)}</p>
                      <p className="text-sm text-gray-500">{member.memberRole}</p>
                    </div>
                  </div>
                  {isClient && (
                    <Link
                      href={`${messagesBasePath}?user=${encodeURIComponent(member.id)}${
                        member.proposalId ? `&proposal=${encodeURIComponent(member.proposalId)}` : ""
                      }`}
                      className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                    >
                      <MessageCircle size={15} /> Mesaj Gönder
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "files" && <ProjectFiles projectId={project.id} canManage={isClient} />}

      {tab === "messages" && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm text-gray-500">
            Ekip üyeleriyle olan konuşmalarınıza buradan ulaşabilirsiniz.
          </p>
          {isClient ? (
            teamMembers.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz bir mesajlaşma yok.</p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <Link
                    key={member.teamMemberId}
                    href={`${messagesBasePath}?user=${encodeURIComponent(member.id)}${
                      member.proposalId ? `&proposal=${encodeURIComponent(member.proposalId)}` : ""
                    }`}
                    className="flex items-center justify-between rounded-xl border border-gray-100 p-4 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
                  >
                    {getFullName(member)}
                    <MessageCircle size={16} className="text-gray-400" />
                  </Link>
                ))}
              </div>
            )
          ) : (
            <Link
              href={`${messagesBasePath}?user=${encodeURIComponent(project.client_id)}`}
              className="flex items-center justify-between rounded-xl border border-gray-100 p-4 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
            >
              Proje sahibine mesaj gönder
              <MessageCircle size={16} className="text-gray-400" />
            </Link>
          )}
        </section>
      )}

      {tab === "deliveries" && (
        <section className="space-y-3">
          {milestones.filter((m) => m.submitted_at).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
              Henüz teslim edilmiş bir aşama yok.
            </div>
          ) : (
            milestones
              .filter((m) => m.submitted_at)
              .map((milestone) => (
                <div key={milestone.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${MILESTONE_STATUS_CLASS[milestone.status]}`}>
                      {MILESTONE_STATUS_LABEL[milestone.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{milestone.deliverable_description}</p>
                  <p className="mt-1 text-xs text-gray-400">Son teslim: {formatDate(milestone.submitted_at)}</p>
                  <div className="mt-3">
                    <ProjectFiles projectId={project.id} milestoneId={milestone.id} canManage={false} />
                  </div>
                </div>
              ))
          )}
        </section>
      )}
    </div>
  );
}
