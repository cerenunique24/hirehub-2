"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {Tabs} from "@/components/ui/Tabs";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
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
import TeamMessagesPanel from "@/components/coalitions/TeamMessagesPanel";
import {
  activateMilestone,
  createMilestone,
  deleteMilestone,
  fetchDeliveryFiles,
  fetchMilestoneDeliveries,
  fetchMilestoneEvents,
  fetchMilestones,
  reviewMilestone,
  submitMilestone,
  type DeliveryFile,
  type Milestone,
  type MilestoneDelivery,
  type MilestoneEvent,
} from "@/lib/projects/milestones";
import {
  notifyDeliveryApproved,
  notifyDeliverySubmitted,
  notifyProjectCompleted,
  notifyRevisionDeliverySubmitted,
  notifyRevisionRequested,
} from "@/lib/notifications";
import ProjectOperationsPanel from "@/components/projects/ProjectOperationsPanel";
import { DEADLINE_STATUS_LABEL, getDeadlineStatus, type DeadlineStatus } from "@/lib/utils/deadline";
import { paymentStatusLabel } from "@/lib/payments/status";
import { publicDisplayName } from "@/lib/utils/displayName";
import styles from "./ProjectWorkroom.module.css";
import { PanelBadge } from "@/components/dashboard/PanelPrimitives";
import { Button } from "@/components/ui/Button";
import { resolveProjectWorkflowState } from "@/lib/projects/workflow-state";

export type WorkroomTeamMember = {
  teamMemberId: string;
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  memberRole: string;
  proposalId: string | null;
};

export type WorkroomProject = {
  description?: string | null;
  id: string;
  client_id: string;
  title: string;
  budget: number | null;
  status: string | null;
  deadline: string | null;
  /** Client'ın projeyi başlatırken onayladığı "gereksinimler hazır" bilgisi. */
  requirements_confirmed_at?: string | null;
  requirements_note?: string | null;
};

type Tab = "overview" | "milestones" | "team" | "files" | "messages" | "deliveries" | "operations";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Genel Bakış" },
  { id: "milestones", label: "Aşamalar" },
  { id: "team", label: "Ekip" },
  { id: "files", label: "Dosyalar" },
  { id: "messages", label: "Mesajlar" },
  { id: "deliveries", label: "Teslimler" },
  { id: "operations", label: "Yönetim" },
];

const DEADLINE_STATUS_CLASS: Record<DeadlineStatus, string> = {
  on_track: "bg-green-50 text-green-700",
  due_soon: "bg-amber-50 text-amber-700",
  overdue: "bg-red-50 text-red-700",
};

const DELIVERY_STATUS_LABEL: Record<MilestoneDelivery["status"], string> = {
  submitted: "İncelemede",
  revision_requested: "Revizyon istendi",
  approved: "Onaylandı",
};

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
  const name = publicDisplayName(member, "");
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
  onProjectChanged,
  isTeamProject = false,
  coalitionId = null,
  initialTab = "overview",
  identityShownAbove = false,
}: {
  project: WorkroomProject;
  teamMembers: WorkroomTeamMember[];
  viewerRole: "client" | "freelancer";
  /** Ör. "/client/messages" ya da "/freelancers/messages" */
  messagesBasePath: string;
  onProjectCompleted?: () => void;
  /** İptal / uyuşmazlık / değerlendirme gibi proje durumunu etkileyebilecek işlemlerden sonra sayfayı yenilemek için. */
  onProjectChanged?: () => void;
  /**
   * true ise (birden fazla rol/freelancer gerektiren proje) her aşama bir
   * freelancer_id'ye bağlıdır ve her freelancer yalnızca kendi rolünün
   * aşamalarını oluşturur/yönetir. false (tek freelancer) ise davranış
   * eskisiyle birebir aynıdır — freelancer_id hiç kullanılmaz.
   */
  isTeamProject?: boolean;
  /**
   * Team project'in coalition'ı. Verilirse "Mesajlar" tab'ı birebir
   * (?user=id) linkler yerine mevcut TeamMessagesPanel + coalition_id
   * konuşmasını gösterir — Genel Mesajlar sayfasındaki "Ekipler" ve
   * coalition detay sayfasındaki mesaj alanıyla AYNI konuşma.
   */
  coalitionId?: string | null;
  initialTab?: "overview" | "milestones";
  /** Suppress duplicated project identity when the containing detail page already shows it. */
  identityShownAbove?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const isClient = viewerRole === "client";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [events, setEvents] = useState<MilestoneEvent[]>([]);
  const [deliveries, setDeliveries] = useState<MilestoneDelivery[]>([]);
  const [deliveryFiles, setDeliveryFiles] = useState<DeliveryFile[]>([]);
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

    const { data: deliveryData } = await fetchMilestoneDeliveries(supabase, project.id);
    const loadedDeliveries = (deliveryData ?? []) as MilestoneDelivery[];
    setDeliveries(loadedDeliveries);

    const { data: fileData } = await fetchDeliveryFiles(
      supabase,
      loadedDeliveries.map((d) => d.id)
    );
    setDeliveryFiles((fileData ?? []) as DeliveryFile[]);

    setLoading(false);
  }, [supabase, project.id]);

  // Yaklaşan / geciken aşamalar için bildirim üretir; sunucu tarafında
  // dedupe_key ile mükerrer bildirim engellenir.
  useEffect(() => {
    if (project.status !== "in_progress") return;
    void supabase.rpc("sync_deadline_notifications", { p_project_id: project.id });
  }, [supabase, project.id, project.status]);

  async function downloadDeliveryFile(file: DeliveryFile) {
    const { data, error: urlError } = await supabase.storage
      .from("project-files")
      .createSignedUrl(file.file_path, 60 * 10);

    if (urlError || !data?.signedUrl) {
      setError("Dosya açılamadı. Lütfen tekrar dene.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const projectActive = project.status === "in_progress";
  const projectClosedMessage =
    project.status === "cancelled"
      ? "Bu proje iptal edildi; yeni teslim veya işlem yapılamaz."
      : project.status === "completed"
        ? "Bu proje tamamlandı; aşamalar artık değiştirilemez."
        : null;

  useEffect(() => {
    void loadMilestones();
  }, [loadMilestones]);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setCurrentUserId(data.user?.id ?? null);
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  const [clientName, setClientName] = useState<string | null>(null);

  useEffect(() => {
    if (!coalitionId) return;

    let active = true;

    supabase
      .from("profiles")
      .select("first_name")
      .eq("id", project.client_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        setClientName(publicDisplayName(data, "Proje sahibi"));
      });

    return () => {
      active = false;
    };
  }, [coalitionId, project.client_id, supabase]);

  const teamMessageLabels = useMemo(() => {
    const labels = teamMembers.map((member) => ({ id: member.id, name: getFullName(member) }));
    if (clientName) labels.push({ id: project.client_id, name: clientName });
    return labels;
  }, [teamMembers, clientName, project.client_id]);

  /** Team project'te "aynı freelancer'ın aşamaları"; tek freelancer projede tüm liste. */
  const peerGroup = useCallback(
    (milestone: Milestone) =>
      isTeamProject
        ? milestones.filter((m) => m.freelancer_id === milestone.freelancer_id)
        : milestones,
    [isTeamProject, milestones]
  );

  const myMilestones = useMemo(
    () => (isTeamProject ? milestones.filter((m) => m.freelancer_id === currentUserId) : milestones),
    [isTeamProject, milestones, currentUserId]
  );

  const canManageMilestone = useCallback(
    (milestone: Milestone) => (isTeamProject ? milestone.freelancer_id === currentUserId : true),
    [isTeamProject, currentUserId]
  );

  function ownerLabel(milestone: Milestone) {
    if (!isTeamProject) return null;
    if (milestone.freelancer_id === currentUserId) return isClient ? null : "Senin rolün";
    const owner = teamMembers.find((m) => m.id === milestone.freelancer_id);
    return owner ? `${owner.memberRole} — ${getFullName(owner)}` : null;
  }

  /** Team project'te aşamaları FREELANCER oluşturur; tek freelancer projede (eski davranış) client oluşturur. */
  const canCreateMilestone = isTeamProject ? !isClient : isClient;

  const approvedCount = milestones.filter((m) => m.status === "approved").length;
  const progress = milestones.length > 0 ? Math.round((approvedCount / milestones.length) * 100) : 0;

  const workflowState = useMemo(
    () => resolveProjectWorkflowState({
      projectStatus: project.status,
      viewerRole,
      isTeamProject,
      milestones,
      currentUserId,
      teamMemberIds: teamMembers.map((member) => member.id),
    }),
    [project.status, viewerRole, isTeamProject, milestones, currentUserId, teamMembers]
  );
  const allMilestonesApproved = workflowState.state === "Tüm aşamalar onaylandı";

  async function handleCompleteProject() {
    if (!window.confirm("Tüm aşamalar onaylandı. Projeyi tamamlamak istediğine emin misin? Bu işlem geri alınamaz.")) {
      return;
    }

    setBusyId("complete-project");
    setError("");

    const { data: completedRow, error: completeError } = await supabase
      .from("projects")
      .update({ status: "completed" })
      .eq("id", project.id)
      .eq("status", "in_progress")
      .select("id")
      .maybeSingle();

    setBusyId(null);

    if (completeError) {
      setError(
        completeError.code === "P0001" ? completeError.message : "Proje tamamlanırken bir hata oluştu."
      );
      return;
    }

    // Filtre eşleşmediyse başka bir sekme durumu değiştirmiş olabilir.
    // Güncel satırı doğrulamadan başarı göstermeyiz veya tekrar bildirim üretmeyiz.
    if (!completedRow) {
      const { data: currentProject } = await supabase
        .from("projects")
        .select("status")
        .eq("id", project.id)
        .maybeSingle();
      if (currentProject?.status === "completed") {
        onProjectCompleted?.();
      } else {
        setError("Proje başka bir sekmede güncellendi; sayfayı yenileyip son durumu kontrol et.");
      }
      return;
    }

    await notifyProjectCompleted(supabase, {
      freelancerIds: teamMembers.map((member) => member.id),
      projectId: project.id,
      projectTitle: project.title,
    });

    onProjectCompleted?.();
  }

  function eventsFor(milestoneId: string) {
    return events.filter((e) => e.milestone_id === milestoneId);
  }

  function revisionCountFor(milestone: Milestone) {
    return Math.max(
      milestone.revision_count ?? 0,
      eventsFor(milestone.id).filter((e) => e.event_type === "revision_requested").length
    );
  }

  async function handleCreateMilestone() {
    if (!newTitle.trim()) {
      setError("Aşama başlığı gerekli.");
      return;
    }

    setError("");
    const isFirst = myMilestones.length === 0;

    const { error: createError } = await createMilestone(supabase, {
      projectId: project.id,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      dueDate: newDueDate || null,
      budget: newBudget ? Number(newBudget) : null,
      sortOrder: myMilestones.length,
      status: isFirst ? "active" : "pending",
      freelancerId: isTeamProject ? currentUserId : null,
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

    const attemptNo = deliveries.filter((d) => d.milestone_id === milestone.id).length + 1;

    if (fromStatus === "revision") {
      await notifyRevisionDeliverySubmitted(supabase, {
        clientId: project.client_id,
        projectId: project.id,
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        attemptNo,
      });
    } else {
      await notifyDeliverySubmitted(supabase, {
        clientId: project.client_id,
        projectId: project.id,
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        attemptNo,
      });
    }

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

    // Team project'te yalnızca aşamanın sahibi (freelancer_id) bilgilendirilir.
    const recipientIds = (
      milestone.freelancer_id
        ? teamMembers.filter((member) => member.id === milestone.freelancer_id)
        : teamMembers
    ).map((member) => member.id);

    if (decision === "approved") {
      await notifyDeliveryApproved(supabase, {
        freelancerIds: recipientIds,
        projectId: project.id,
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
      });
    } else {
      await notifyRevisionRequested(supabase, {
        freelancerIds: recipientIds,
        projectId: project.id,
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        revisionNo: (milestone.revision_count ?? 0) + 1,
      });
    }

    if (decision === "approved") {
      const remaining = milestones.filter((m) => m.id !== milestone.id);
      // Team project'te bir sonraki aşama SADECE aynı freelancer'ın kendi
      // rolü içinden seçilir — bir kişinin aşaması onaylandığında başka
      // bir ekip üyesinin aşamasını otomatik başlatmamalı.
      const ownRemaining = isTeamProject
        ? remaining.filter((m) => m.freelancer_id === milestone.freelancer_id)
        : remaining;
      const nextPending = ownRemaining
        .filter((m) => m.status === "pending")
        .sort((a, b) => a.sort_order - b.sort_order)[0];

      if (nextPending) {
        await activateMilestone(supabase, nextPending.id);
      }
      // NOT: Tüm aşamalar onaylandığında proje OTOMATİK "tamamlandı" olmaz.
      // "Tüm aşamalar tamamlandı" ile "Proje tamamlandı" ayrı durumlardır —
      // client, aşağıdaki "Projeyi Tamamla" aksiyonuyla bilinçli olarak
      // onaylamalı (bkz. handleCompleteProject). Bu, review'ların da
      // yalnızca GERÇEKTEN tamamlanmış bir projede açılmasını sağlar.
    } else {
      setRevisionDrafts((current) => ({ ...current, [milestone.id]: "" }));
    }

    setBusyId(null);
    await loadMilestones();
  }

  const viewerMember=teamMembers.find(member=>member.id===currentUserId);
  const projectStatusLabel=({open:"Ekip kuruluyor",ready_to_start:"Ekip hazır · Başlamadı",in_progress:"Çalışma devam ediyor",completed:"Tamamlandı",paused:"Duraklatıldı",cancelled:"İptal edildi"} as Record<string,string>)[project.status??""]??"Tanımsız";

  return (
    <div className="space-y-5">
      {!identityShownAbove && <header className={styles.header}>
        <div className={styles.headerTitle}><div><p className={styles.eyebrow}>Proje detayları</p><h2>{project.title}</h2></div><PanelBadge>{projectStatusLabel}</PanelBadge></div>
        <dl className={styles.metadata}>
          <div><dt>{isClient ? "Proje sahibi" : "Projede rolün"}</dt><dd>{isClient ? "Client" : viewerMember?.memberRole || (currentUserId ? "Rol bilgisi bulunmuyor" : "Yükleniyor")}</dd></div>
          <div><dt>Ekip</dt><dd>{teamMembers.length} freelancer{isTeamProject ? " · Ekip projesi" : ""}</dd></div>
          <div><dt>Son tarih</dt><dd>{formatDate(project.deadline)}</dd></div>
        </dl>
      </header>}
      <section className={styles.status} data-action-required={!loading && workflowState.currentUserMustAct} aria-label="Şu anki durum" aria-live="polite">
        <div className={styles.statusBody}>
          <div><p className={styles.eyebrow}>Şu anki durum</p><h3>{loading ? "Durum yükleniyor" : error ? "Durum doğrulanamadı" : workflowState.state}</h3><p className={styles.nextStep}>{loading ? "Proje aşamaları kontrol ediliyor." : error ? "Aşama bilgileri alınamadı; yeniden kontrol et." : workflowState.nextStep}</p>
            {!loading && !error && <p className={styles.actionOwner}>Aksiyon sahibi: <strong>{workflowState.currentUserMustAct ? "Sen" : workflowState.actionOwner}</strong> · {workflowState.currentUserMustAct ? "Senden işlem bekleniyor" : "Şu an senden işlem beklenmiyor"}</p>}
          </div>
          {!loading && !error && workflowState.currentUserMustAct && (isClient && allMilestonesApproved && project.status==="in_progress" ?
            <Button onClick={()=>void handleCompleteProject()} disabled={busyId==="complete-project"}>{busyId==="complete-project" && <Loader2 size={16} className="animate-spin" />}Projeyi Tamamla</Button> :
            <Button onClick={()=>setTab("milestones")}>Aşamaları Aç</Button>)}
        </div>
        {projectClosedMessage && <p className={styles.systemMeta}>{projectClosedMessage}</p>}
        {project.requirements_confirmed_at && <p className={styles.systemMeta}><CheckCircle2 size={15} aria-hidden="true" />Gereksinimler hazır · Client {formatDate(project.requirements_confirmed_at)} tarihinde onayladı.</p>}
      </section>
      <Tabs items={TABS.map(item=>({value:item.id,label:item.label}))} value={tab} onChange={value=>setTab(value as Tab)} />
      {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!identityShownAbove && tab==="overview" && project.description && <section className={styles.context}><h3>Proje kapsamı</h3><p>{project.description}</p></section>}
      {tab==="overview" && project.requirements_note && <section className={styles.clientNote}><h3>Client notu</h3><p>{project.requirements_note}</p></section>}

      {tab === "overview" && (
        <section className="grid gap-4 sm:grid-cols-2">
          {!identityShownAbove && <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Bütçe</p>
            <p className="mt-1 font-semibold text-gray-900">{project.budget==null?"Belirtilmedi":formatCurrency(Number(project.budget))}</p>
          </div>}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Aşama ilerlemesi</p>
            <p className="mt-1 font-semibold text-gray-900">
              {approvedCount}/{milestones.length || 0}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-[var(--color-primary-600)]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </section>
      )}

      {tab === "milestones" && (
        <section className="space-y-4">
          {isTeamProject && (
            <p className="text-sm text-gray-500">
              {isClient
                ? "Her ekip üyesi kendi rolüne ait aşamaları oluşturur. Bir aşamayı kabul ettiğinde o freelancer'ın aşaması aktif hale gelir."
                : "Burada yalnızca kendi rolüne ait aşamaları oluşturup yönetebilirsin. Diğer ekip üyelerinin aşamaları bilgi amaçlı görünür."}
            </p>
          )}

          {canCreateMilestone && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowCreate((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
              >
                <Plus size={16} />
                Aşama ekle
              </button>
            </div>
          )}

          {canCreateMilestone && showCreate && (
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
                  className="rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white"
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
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              {canCreateMilestone ? "Henüz aşama eklenmedi." : "Bu proje için henüz aşama tanımlanmadı."}
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((milestone) => {
                const history = eventsFor(milestone.id);
                const revisionCount = revisionCountFor(milestone);
                const deadlineStatus = getDeadlineStatus({ dueDate: milestone.due_date, status: milestone.status });
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
                          {deadlineStatus && deadlineStatus !== "on_track" && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${DEADLINE_STATUS_CLASS[deadlineStatus]}`}
                            >
                              {deadlineStatus === "overdue" && <AlertTriangle size={12} />}
                              {DEADLINE_STATUS_LABEL[deadlineStatus]}
                            </span>
                          )}
                        </div>
                        {ownerLabel(milestone) && (
                          <p className="mt-1 text-xs font-medium text-gray-400">{ownerLabel(milestone)}</p>
                        )}
                        {milestone.description && (
                          <p className="mt-2 max-w-2xl text-sm text-gray-600">{milestone.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                          {milestone.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock3 size={13} /> {formatDate(milestone.due_date)}
                            </span>
                          )}
                          {milestone.budget !== null && (
                            <span>
                              {isClient && milestone.client_total_amount !== null
                                ? `Toplam ödeme: ${formatCurrency(Number(milestone.client_total_amount))} (bütçe ${formatCurrency(Number(milestone.budget))} + platform ücreti ${formatCurrency(Number(milestone.platform_fee_amount ?? 0))})`
                                : `Net kazanç: ${formatCurrency(Number(milestone.freelancer_payout_amount ?? milestone.budget))}`}
                            </span>
                          )}
                          {milestone.budget !== null && <span>{paymentStatusLabel(milestone.payment_status)}</span>}
                        </div>
                      </div>

                      {(isClient || (isTeamProject && canManageMilestone(milestone))) &&
                        milestone.status === "pending" && (
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
                    {!isClient &&
                      projectActive &&
                      canManageMilestone(milestone) &&
                      (milestone.status === "active" || milestone.status === "revision") && (
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
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:opacity-50"
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
                    {isClient && projectActive && (milestone.status === "submitted" || milestone.status === "in_review") && (
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
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:opacity-50"
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
                      projectActive &&
                      milestone.status === "pending" &&
                      peerGroup(milestone).every(
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
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
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
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
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
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          {isTeamProject && coalitionId && currentUserId ? (
            <>
              <p className="mb-4 text-sm text-gray-500">
                Client ve tüm aktif ekip üyeleri bu ekip konuşmasını görür.
              </p>
              <TeamMessagesPanel
                coalitionId={coalitionId}
                currentUserId={currentUserId}
                memberLabels={teamMessageLabels}
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </section>
      )}

      {tab === "deliveries" && (
        <section className="space-y-3">
          {/*
           * Teslimler artık normal proje dosyalarından ayrı bir kayıttır
           * (project_milestone_deliveries). Her teslim denemesi — ilk teslim
           * ve her yeniden teslim — kendi mesajı, dosyaları ve inceleme
           * sonucuyla listelenir; revizyon geçmişi kaybolmaz.
           */}
          {deliveries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              Henüz teslim edilmiş bir aşama yok.
            </div>
          ) : (
            milestones
              .filter((m) => deliveries.some((d) => d.milestone_id === m.id))
              .map((milestone) => {
                const attempts = deliveries
                  .filter((d) => d.milestone_id === milestone.id)
                  .sort((a, b) => b.attempt_no - a.attempt_no);

                return (
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

                    <ol className="mt-4 space-y-3">
                      {attempts.map((delivery) => {
                        const files = deliveryFiles.filter((f) => f.delivery_id === delivery.id);
                        return (
                          <li key={delivery.id} className="rounded-xl bg-gray-50 p-4 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-gray-900">
                                {delivery.attempt_no}. teslim · {formatDateTime(delivery.submitted_at)}
                              </span>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
                                {DELIVERY_STATUS_LABEL[delivery.status]}
                              </span>
                            </div>
                            <p className="mt-2 text-gray-700">{delivery.message || "Açıklama eklenmedi."}</p>

                            {files.length > 0 ? (
                              <ul className="mt-3 space-y-1.5">
                                {files.map((file) => (
                                  <li key={file.id}>
                                    <button
                                      type="button"
                                      onClick={() => void downloadDeliveryFile(file)}
                                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                                    >
                                      <Download size={14} />
                                      {file.file_name}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-3 text-xs text-gray-400">Bu teslimle birlikte dosya gönderilmedi.</p>
                            )}

                            {delivery.status === "revision_requested" && delivery.review_feedback && (
                              <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                                <p className="mb-1 font-medium">Revizyon geri bildirimi</p>
                                {delivery.review_feedback}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })
          )}
        </section>
      )}

      {tab === "operations" && currentUserId && (
        <ProjectOperationsPanel
          project={project}
          teamMembers={teamMembers}
          milestones={milestones}
          viewerRole={viewerRole}
          currentUserId={currentUserId}
          onChanged={() => {
            void loadMilestones();
            onProjectChanged?.();
          }}
        />
      )}
    </div>
  );
}
