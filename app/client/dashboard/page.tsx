"use client";

import { buttonClasses } from "@/components/ui/Button";
import { pageHeaderClass } from "@/components/ui/PageHeader";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight, Bell, BriefcaseBusiness, Check, CircleAlert, Clock3,
  FolderKanban, Plus, Sparkles, UsersRound,
} from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDeadlineDate, formatRemainingTime, getDeadlineStatus } from "@/lib/utils/deadline";
import { fetchBudgetBreakdown, getTeamCompletion } from "@/lib/projects/teamReadiness";
import { knownAmount, projectWork, type DashboardMilestone } from "@/lib/projects/dashboard";

type ClientProject = {
  id: string;
  title: string;
  status: string | null;
  deadline: string | null;
  team_required: boolean | null;
  commission_rate: number | string | null;
};

type TeamMember = {
  project_id: string;
  freelancer_id: string;
  role: string | null;
  agreed_amount: number | string | null;
  first_name: string | null;
  avatar_url: string | null;
};

type ProjectCard = ClientProject & {
  work: ReturnType<typeof projectWork>;
  roles: string[];
  members: TeamMember[];
  teamSummary: string;
  teamReady: boolean;
  proposalCount: number;
  cost: number | null;
  missingCost: boolean;
};

type Activity = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  created_at: string;
};

type Profile = { first_name: string | null };

type DashboardData = {
  profile: Profile | null;
  projectCount: number;
  activeProjects: ProjectCard[];
  readyProjects: ProjectCard[];
  openProjects: ProjectCard[];
  activities: Activity[];
};

const IMPORTANT_EVENTS = [
  "proposal_received",
  "coalition_ready",
  "project_started",
  "milestone_submitted",
  "milestone_approved",
  "milestone_revision_submitted",
  "project_completed",
  "milestone_revision",
  "milestone_overdue",
];

const statusTone: Record<string, string> = {
  "Ekip hazır · Başlamadı": "bg-[var(--color-success-50)] text-[var(--color-success-600)] ring-[var(--color-success-600)]/20",
  "Teslim müşteri incelemesinde": "bg-[var(--color-warning-50)] text-[var(--color-warning-600)] ring-[var(--color-warning-600)]/20",
  "Tüm aşamalar onaylandı": "bg-[var(--color-success-50)] text-[var(--color-success-600)] ring-[var(--color-success-600)]/20",
  "Duraklatıldı": "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] ring-[var(--color-border-subtle)]",
};

function actionType(project: ProjectCard) {
  if (project.status === "ready_to_start") return "Ekip hazır";
  if (project.proposalCount > 0) return "Teklifler geldi";
  if (project.work.overdueMilestones.length > 0) return "Geciken aşama";
  if (project.work.workflow.state === "Teslim müşteri incelemesinde") return "Teslim incelemesi";
  return project.work.workflow.state;
}

function actionCta(project: ProjectCard) {
  if (project.status === "ready_to_start") return "Projeyi başlat";
  if (project.proposalCount > 0) return "Teklifleri incele";
  if (project.work.workflow.currentUserMustAct) return "İncele";
  return "Projeye git";
}

function actionReason(project: ProjectCard) {
  if (project.status === "ready_to_start") return `${project.teamSummary}. Projeyi başlatman bekleniyor.`;
  if (project.proposalCount > 0) return `${project.proposalCount} teklif değerlendirilmeyi bekliyor.`;
  if (project.work.overdueMilestones.length > 0) {
    return `“${project.work.overdueMilestones[0].title}” aşamasının süresi geçti.`;
  }
  return project.work.workflow.nextStep;
}

function projectStage(project: ProjectCard) {
  if (project.status === "ready_to_start") return 1;
  if (project.status === "in_progress" || project.status === "paused") return 2;
  if (project.work.workflow.state === "Tüm aşamalar onaylandı") return 3;
  return 0;
}

export default function ClientDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      const { data: authData, error: userError } = await supabase.auth.getUser();
      const user = authData.user;
      if (userError || !user) {
        if (active) setError("Paneli görüntülemek için giriş yapmanız gerekiyor.");
        return;
      }

      const [projectResult, profileResult] = await Promise.all([
        supabase
          .from("projects")
          .select("id, title, status, deadline, team_required, commission_rate")
          .eq("client_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_my_full_profile"),
      ]);

      if (projectResult.error) {
        if (active) setError("Projeleriniz yüklenirken bir sorun oluştu.");
        return;
      }

      const projects = (projectResult.data ?? []) as ClientProject[];
      const visibleProjects = projects.filter((project) =>
        ["open", "ready_to_start", "in_progress", "paused"].includes(project.status ?? "")
      );
      const projectIds = visibleProjects.map((project) => project.id);
      const openIds = visibleProjects.filter((project) => project.status === "open").map((project) => project.id);

      const [teamResult, milestoneResult, proposalResult, activityResult] = await Promise.all([
        projectIds.length
          ? supabase
              .from("project_team_members")
              .select("project_id, freelancer_id, role, agreed_amount")
              .in("project_id", projectIds)
              .eq("status", "active")
          : Promise.resolve({ data: [] as TeamMember[], error: null }),
        projectIds.length
          ? supabase
              .from("project_milestones")
              .select("id, project_id, title, due_date, status, sort_order, freelancer_id")
              .in("project_id", projectIds)
              .order("sort_order", { ascending: true })
          : Promise.resolve({ data: [] as DashboardMilestone[], error: null }),
        openIds.length
          ? supabase
              .from("proposals")
              .select("project_id, status")
              .in("project_id", openIds)
              .in("status", ["pending", "shortlisted"])
          : Promise.resolve({ data: [] as Array<{ project_id: string; status: string | null }>, error: null }),
        supabase
          .from("notifications")
          .select("id, title, message, link, created_at")
          .eq("user_id", user.id)
          .in("type", IMPORTANT_EVENTS)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (teamResult.error || milestoneResult.error || proposalResult.error || activityResult.error) {
        if (active) setError("Proje akışı yüklenemedi. Lütfen tekrar deneyin.");
        return;
      }

      const rawMembers = (teamResult.data ?? []) as Omit<TeamMember, "first_name" | "avatar_url">[];
      const freelancerIds = [...new Set(rawMembers.map((member) => member.freelancer_id))];
      const profileRows = freelancerIds.length
        ? await supabase.from("profiles").select("id, first_name, avatar_url").in("id", freelancerIds)
        : { data: [], error: null };

      if (profileRows.error) {
        if (active) setError("Ekip profilleri yüklenemedi. Lütfen tekrar deneyin.");
        return;
      }

      const profilesById = new Map((profileRows.data ?? []).map((profile) => [profile.id, profile]));
      const members = rawMembers.map((member) => ({
        ...member,
        first_name: profilesById.get(member.freelancer_id)?.first_name ?? null,
        avatar_url: profilesById.get(member.freelancer_id)?.avatar_url ?? null,
      }));

      const breakdowns = new Map(
        await Promise.all(
          visibleProjects.map(async (project) => [project.id, await fetchBudgetBreakdown(supabase, project.id)] as const)
        )
      );

      const milestones = (milestoneResult.data ?? []) as DashboardMilestone[];
      const proposals = proposalResult.data ?? [];
      const cards: ProjectCard[] = visibleProjects.map((project) => {
        const projectMembers = members.filter((member) => member.project_id === project.id);
        const breakdown = breakdowns.get(project.id) ?? [];
        const team = getTeamCompletion(breakdown, projectMembers);
        const agreementsKnown = projectMembers.length > 0 && projectMembers.every((member) => knownAmount(member.agreed_amount) !== null);
        const memberCost = agreementsKnown
          ? projectMembers.reduce((total, member) => total + (knownAmount(member.agreed_amount) ?? 0), 0)
          : null;
        const serviceFeeRate = knownAmount(project.commission_rate);
        const cost = memberCost !== null && serviceFeeRate !== null
          ? Math.round(memberCost * (1 + serviceFeeRate) * 100) / 100
          : null;

        return {
          ...project,
          work: projectWork({
            status: project.status,
            teamRequired: Boolean(project.team_required),
            viewer: "client",
            userId: user.id,
            memberIds: projectMembers.map((member) => member.freelancer_id),
            milestones: milestones.filter((milestone) => milestone.project_id === project.id),
          }),
          roles: breakdown.map((role) => role.role ?? role.name ?? "").filter(Boolean),
          members: projectMembers,
          teamSummary: project.team_required && breakdown.length === 0
            ? `${projectMembers.length} ekip üyesi`
            : `${team.filledRoles} / ${team.totalRoles} rol dolu`,
          teamReady: team.ready,
          proposalCount: proposals.filter((proposal) => proposal.project_id === project.id).length,
          cost,
          missingCost: cost === null,
        };
      });

      if (active) {
        setData({
          profile: Array.isArray(profileResult.data) ? (profileResult.data[0] as Profile | undefined) ?? null : null,
          projectCount: projects.length,
          activeProjects: cards.filter((project) => project.status === "in_progress" || project.status === "paused"),
          readyProjects: cards.filter((project) => project.status === "ready_to_start"),
          openProjects: cards.filter((project) => project.status === "open"),
          activities: (activityResult.data ?? []) as Activity[],
        });
      }
    }

    void loadDashboard()
      .catch(() => {
        if (active) setError("Panel yüklenemedi. Lütfen tekrar deneyin.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey, supabase]);

  if (loading) return <DashboardLoading />;
  if (error) return <DashboardError message={error} retry={() => setReloadKey((key) => key + 1)} />;
  if (!data) return null;

  const allProjects = [...data.readyProjects, ...data.activeProjects, ...data.openProjects];
  const actions = allProjects.filter(
    (project) => project.work.workflow.currentUserMustAct || project.proposalCount > 0 || project.work.overdueMilestones.length > 0
  );
  const activeCost = data.activeProjects.reduce((total, project) => total + (project.cost ?? 0), 0);
  const activeCostMissing = data.activeProjects.some((project) => project.missingCost);
  const deadlineItems = data.activeProjects
    .flatMap((project) => {
      const milestone = project.work.currentMilestone;
      const deadline = milestone?.due_date ?? project.deadline;
      return deadline ? [{ project, milestone, deadline }] : [];
    })
    .sort((a, b) => (formatRemainingTime(a.deadline).days ?? Number.MAX_SAFE_INTEGER) - (formatRemainingTime(b.deadline).days ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 5);
  const filledTeams = data.readyProjects.length;
  const projectsWithGaps = data.openProjects.filter((project) => project.team_required && !project.teamReady).length;
  const pendingOffers = data.openProjects.reduce((total, project) => total + project.proposalCount, 0);

  return (
    <div className="w-full text-[var(--color-text-primary)]">
      <header className={pageHeaderClass}>
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">Çalışma merkezi</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Merhaba{data.profile?.first_name ? `, ${data.profile.first_name}` : ""}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Projelerindeki ilerlemeyi ve bekleyen kararları buradan yönet.</p>
        </div>
        <Link href="/client/projects/new" className={buttonClasses({variant:"primary"})}>
          <Plus size={16} />
          Yeni Proje Oluştur
        </Link>
      </header>

      <section aria-label="Proje özeti" className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard icon={<FolderKanban />} label="Aktif Projeler" value={data.activeProjects.length} detail={data.activeProjects.length ? "Çalışma devam ediyor" : "Şu an aktif çalışma yok"} tone="blue" />
        <KpiCard icon={<CircleAlert />} label="Senden Aksiyon Bekleyen" value={actions.length} detail={actions.length ? "Karar veya inceleme bekliyor" : "Bekleyen işlemin yok"} tone={actions.length ? "amber" : "green"} />
        <KpiCard icon={<Sparkles />} label="Teklif / Eşleşme" value={pendingOffers} detail={pendingOffers ? "Değerlendirilmeyi bekliyor" : "Yeni teklif bekleniyor"} tone="purple" />
        <KpiCard icon={<BriefcaseBusiness />} label="Aktif Proje Maliyeti" value={activeCostMissing ? "—" : formatCurrency(activeCost)} detail={activeCostMissing ? "Maliyet bilgisi eksik" : "Hizmet bedeli dahil"} tone="green" />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <main className="space-y-6 lg:col-span-8">
          <DashboardSection title="Senden Beklenenler" description="Bugün karar vermen veya takip etmen gereken işler">
            {actions.length ? (
              <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white">
                {actions.slice(0, 3).map((project) => <ActionItem key={project.id} project={project} />)}
              </div>
            ) : (
              <SmallEmpty icon={<Check size={17} />} title="Senden beklenen bir işlem yok" description="Projelerindeki yeni gelişmeler burada görünecek." />
            )}
          </DashboardSection>

          <DashboardSection title="Aktif Projeler" description="Ekip, iş akışı ve maliyet görünümü" href="/client/projects">
            {data.activeProjects.length ? (
              <div className="space-y-3">
                {data.activeProjects.map((project) => <ActiveProjectCard key={project.id} project={project} />)}
              </div>
            ) : (
              <SmallEmpty icon={<FolderKanban size={17} />} title={data.projectCount ? "Aktif projen yok" : "Henüz bir projen yok"} description={data.projectCount ? "Başlatılmayı veya eşleşme sürecindeki projelerini aşağıdan takip edebilirsin." : "İlk projen için doğru freelancerları ve ekibi bulmaya başlayabilirsin."} actionHref={data.projectCount ? "/client/projects" : "/client/projects/new"} action={data.projectCount ? "Projeleri gör" : "Proje oluştur"} />
            )}
          </DashboardSection>

          {(data.readyProjects.length > 0 || data.openProjects.length > 0) && (
            <DashboardSection title="Bekleyen Projeler" description="Başlatmaya hazır ve teklif/eşleşme sürecindeki projeler">
              <div className="grid gap-4 md:grid-cols-2">
                <WaitingGroup title="Başlangıç Bekleyen" projects={data.readyProjects} empty="Başlatılmayı bekleyen proje yok." type="ready" />
                <WaitingGroup title="Teklif & Eşleşme" projects={data.openProjects} empty="Yayında veya teklif bekleyen proje yok." type="open" />
              </div>
            </DashboardSection>
          )}
        </main>

        <aside className="space-y-5 lg:sticky lg:top-5 lg:col-span-4 lg:self-start">
          <AsideCard title="Yaklaşan Deadline’lar" icon={<Clock3 size={16} />}>
            {deadlineItems.length ? (
              <div className="divide-y divide-neutral-100">
                {deadlineItems.map(({ project, milestone, deadline }) => <DeadlineItem key={`${project.id}-${milestone?.id ?? "project"}`} project={project} milestone={milestone} deadline={deadline} />)}
              </div>
            ) : <p className="text-sm leading-6 text-[var(--color-text-secondary)]">Aktif projelerde yaklaşan bir deadline yok.</p>}
          </AsideCard>

          <AsideCard title="Ekip Durumu" icon={<UsersRound size={16} />}>
            <div className="space-y-3 text-sm">
              <TeamStat value={filledTeams} label="ekip başlamaya hazır" tone="text-emerald-700" />
              <TeamStat value={projectsWithGaps} label="projede rol açığı var" tone="text-amber-700" />
              <TeamStat value={pendingOffers} label="teklif değerlendiriliyor" tone="text-violet-700" />
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5">
              <AvatarStack members={allProjects.flatMap((project) => project.members).slice(0, 4)} />
              <Link href="/client/projects" className="text-xs font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)]">Ekipleri gör</Link>
            </div>
          </AsideCard>

          <AsideCard title="Son Önemli Hareketler" icon={<Bell size={16} />} href="/client/notifications">
            {data.activities.length ? (
              <div className="space-y-4">
                {data.activities.slice(0, 5).map((activity) => <ActivityItem key={activity.id} activity={activity} />)}
              </div>
            ) : <p className="text-sm leading-6 text-[var(--color-text-secondary)]">Henüz gösterilecek önemli bir hareket yok.</p>}
          </AsideCard>
        </aside>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: number | string; detail: string; tone: "blue" | "green" | "amber" | "purple" }) {
  const toneClass = { blue: "bg-[var(--color-info-50)] text-[var(--color-info-600)]", green: "bg-[var(--color-success-50)] text-[var(--color-success-600)]", amber: "bg-[var(--color-warning-50)] text-[var(--color-warning-600)]", purple: "bg-[var(--color-primary-50)] text-[var(--color-primary-600)]" }[tone];
  return <div className="min-h-[112px] rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-4"><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</p><span className={`rounded-md p-1.5 ${toneClass}`}>{icon}</span></div><p className="mt-3 text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">{value}</p><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{detail}</p></div>;
}

function DashboardSection({ title, description, href, children }: { title: string; description: string; href?: string; children: ReactNode }) {
  return <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="cc-h2 font-semibold text-[var(--color-text-primary)]">{title}</h2><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{description}</p></div>{href && <Link href={href} className="shrink-0 text-sm font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)]">Tümünü gör</Link>}</div>{children}</section>;
}

function ActionItem({ project }: { project: ProjectCard }) {
  const deadline = project.work.currentMilestone?.due_date ?? project.work.overdueMilestones[0]?.due_date ?? null;
  const needsAction = project.work.workflow.currentUserMustAct || project.proposalCount > 0;
  return <div className="flex flex-col gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-[var(--color-text-primary)]">{project.title}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${needsAction ? "bg-[var(--color-warning-50)] text-[var(--color-warning-600)]" : "bg-[var(--color-error-50)] text-[var(--color-error-600)]"}`}>{actionType(project)}</span></div><div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-secondary)]"><span>{project.teamSummary}</span><span aria-hidden="true">·</span><span>{deadline ? `${formatDeadlineDate(deadline)} · ${formatRemainingTime(deadline).label}` : "Deadline belirtilmemiş"}</span></div><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{actionReason(project)}</p></div><Link href={`/client/projects/${project.id}`} className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:self-auto ${needsAction ? "bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)]" : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-neutral-200"}`}>{actionCta(project)}<ArrowRight size={14} /></Link></div>;
}
function ActiveProjectCard({ project }: { project: ProjectCard }) {
  const stage = projectStage(project);
  const currentMilestone = project.work.currentMilestone;
  const statusClass = statusTone[project.work.workflow.state] ?? "bg-[var(--color-info-50)] text-[var(--color-info-600)] ring-[var(--color-info-600)]/20";
  const progress = project.work.totalMilestones ? Math.round((project.work.approvedMilestones / project.work.totalMilestones) * 100) : 0;
  const deadline = currentMilestone?.due_date ?? project.deadline;
  const actionOwner = project.work.workflow.currentUserMustAct || project.work.workflow.actionOwner === "Client"
    ? "Senden aksiyon bekleniyor"
    : `${project.work.workflow.actionOwner} tarafında`;

  return <article className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-4 transition hover:border-neutral-300 hover:shadow-[0_2px_10px_rgb(0_0_0_/_0.04)] sm:p-5"><div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]"><div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/client/projects/${project.id}`} className="text-base font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary-600)]">{project.title}</Link><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{project.roles.join(" · ") || "Roller belirtilmemiş"}</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${statusClass}`}>{project.work.workflow.state}</span></div><div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3"><div className="flex items-center gap-2"><AvatarStack members={project.members} /><span className="text-xs text-[var(--color-text-secondary)]">{project.teamSummary}</span></div><div className="text-xs text-[var(--color-text-secondary)]"><span className="font-medium text-[var(--color-text-primary)]">{project.cost === null ? "Maliyet belirtilmemiş" : formatCurrency(project.cost)}</span>{project.cost !== null && " · hizmet bedeli dahil"}</div></div><WorkflowRail currentStage={stage} /></div><div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]/70 p-3.5"><p className="text-xs font-medium text-[var(--color-text-secondary)]">Mevcut iş</p><p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{currentMilestone?.title ?? project.work.workflow.state}</p><p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">{actionOwner}</p>{deadline && <p className={`mt-2 text-xs ${formatRemainingTime(deadline).overdue ? "text-[var(--color-error-600)]" : "text-[var(--color-text-secondary)]"}`}>{formatDeadlineDate(deadline)} · {formatRemainingTime(deadline).label}</p>}<Link href={`/client/projects/${project.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)]">{project.work.workflow.currentUserMustAct ? "İşi incele" : "Projeye git"} <ArrowRight size={14} /></Link></div></div><div className="mt-4 flex items-center gap-3 border-t border-[var(--color-border-subtle)] pt-3"><p className="shrink-0 text-xs text-[var(--color-text-secondary)]">{project.work.totalMilestones ? `${project.work.approvedMilestones} / ${project.work.totalMilestones} aşama onaylandı` : "Aşamalar henüz tanımlanmadı"}</p><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]"><div className="h-full rounded-full bg-[var(--color-primary-600)]" style={{ width: `${progress}%` }} /></div></div></article>;
}
function WorkflowRail({ currentStage }: { currentStage: number }) {
  const stages = ["Ekip", "Başlangıç", "Çalışma", "Teslim", "Tamamlandı"];
  return <div aria-label="Proje akışı" className="mt-4 grid grid-cols-5 border-y border-[var(--color-border-subtle)] py-3">{stages.map((label, index) => <div key={label} className="relative text-center"><span className={`mx-auto flex h-4 w-4 items-center justify-center rounded-full border ${index < currentStage ? "border-emerald-600 bg-emerald-600 text-white" : index === currentStage ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)]" : "border-neutral-300 bg-white"}`}>{index < currentStage && <Check size={10} strokeWidth={3} />}</span>{index < stages.length - 1 && <span className={`absolute left-[calc(50%+8px)] top-[7px] h-px w-[calc(100%-16px)] ${index < currentStage ? "bg-emerald-500" : "bg-neutral-200"}`} />}{index === currentStage && <span className="mt-1 block text-[10px] font-medium text-[var(--color-primary-600)]">{label}</span>}{index !== currentStage && <span className="mt-1 block text-[10px] text-[var(--color-text-muted)]">{label}</span>}</div>)}</div>;
}

function WaitingGroup({ title, projects, empty, type }: { title: string; projects: ProjectCard[]; empty: string; type: "ready" | "open" }) {
  return <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-4"><div className="mb-3 flex items-center gap-2"><span className={`rounded-md p-1.5 ${type === "ready" ? "bg-[var(--color-success-50)] text-[var(--color-success-600)]" : "bg-violet-50 text-violet-700"}`}>{type === "ready" ? <Check size={15} /> : <Sparkles size={15} />}</span><h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3></div>{projects.length ? <div className="space-y-3">{projects.slice(0, 3).map((project) => <div key={project.id} className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{project.title}</p><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{type === "ready" ? project.teamSummary : project.proposalCount ? `${project.proposalCount} yeni teklif` : "Yeni teklif ve eşleşme bekleniyor"}</p></div><Link href={`/client/projects/${project.id}`} className="shrink-0 text-xs font-medium text-[var(--color-primary-600)]">İncele</Link></div>)}</div> : <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{empty}</p>}</div>;
}

function AsideCard({ title, icon, href, children }: { title: string; icon: ReactNode; href?: string; children: ReactNode }) {
  return <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-4"><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-[var(--color-text-primary)]"><span className="text-[var(--color-text-secondary)]">{icon}</span><h2 className="text-sm font-semibold">{title}</h2></div>{href && <Link href={href} className="text-xs font-medium text-[var(--color-primary-600)]">Tümü</Link>}</div>{children}</section>;
}

function DeadlineItem({ project, milestone, deadline }: { project: ProjectCard; milestone: DashboardMilestone | null; deadline: string }) {
  const remaining = formatRemainingTime(deadline);
  const deadlineStatus = milestone ? getDeadlineStatus({ dueDate: deadline, status: milestone.status }) : remaining.overdue ? "overdue" : remaining.days !== null && remaining.days <= 2 ? "due_soon" : "on_track";
  const className = deadlineStatus === "overdue" ? "bg-red-50 text-red-700" : deadlineStatus === "due_soon" ? "bg-amber-50 text-amber-700" : "bg-neutral-100 text-neutral-600";
  return <Link href={`/client/projects/${project.id}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{project.title}</p><p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{milestone?.title ?? "Proje deadline’ı"}</p></div><div className="shrink-0 text-right"><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${className}`}>{remaining.label}</span><p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{formatDeadlineDate(deadline)}</p></div></Link>;
}

function TeamStat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return <div className="flex items-baseline justify-between gap-4"><p className="text-[var(--color-text-secondary)]">{label}</p><p className={`font-semibold ${tone}`}>{value}</p></div>;
}

function AvatarStack({ members }: { members: TeamMember[] }) {
  if (!members.length) return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"><UsersRound size={15} /></span>;
  return <div className="flex -space-x-2">{members.slice(0, 4).map((member) => <Avatar key={`${member.project_id}-${member.freelancer_id}`} src={member.avatar_url} name={member.first_name ?? member.role} size="sm" className="ring-2 ring-white" />)}{members.length > 4 && <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[10px] font-medium text-[var(--color-text-secondary)] ring-2 ring-white">+${members.length - 4}</span>}</div>;
}

function ActivityItem({ activity }: { activity: Activity }) {
  const content = <><p className="text-sm font-medium text-[var(--color-text-primary)]">{activity.title}</p>{activity.message && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-secondary)]">{activity.message}</p>}<time className="mt-1 block text-[11px] text-[var(--color-text-muted)]" dateTime={activity.created_at}>{new Date(activity.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</time></>;
  return activity.link ? <Link href={activity.link} className="block rounded-lg p-1 transition hover:bg-[var(--color-surface-2)]">{content}</Link> : <div className="rounded-lg p-1">{content}</div>;
}

function SmallEmpty({ icon, title, description, actionHref, action }: { icon: ReactNode; title: string; description: string; actionHref?: string; action?: string }) {
  return <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-4 py-5"><div className="flex items-start gap-3"><span className="rounded-lg bg-white p-2 text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border-subtle)]">{icon}</span><div><p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p><p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>{actionHref && action && <Link href={actionHref} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary-600)]">{action}<ArrowRight size={14} /></Link>}</div></div></div>;
}

function DashboardLoading() {
  return <div className="flex min-h-[55vh] items-center justify-center text-sm text-[var(--color-text-secondary)]">Çalışma merkezi yükleniyor…</div>;
}

function DashboardError({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="rounded-[var(--radius-card)] border border-[var(--color-error-600)]/20 bg-[var(--color-error-50)] p-5 text-sm text-[var(--color-error-600)]"><p>{message}</p><button type="button" onClick={retry} className="mt-3 rounded-lg border border-[var(--color-error-600)]/20 bg-white px-3 py-2 font-medium text-[var(--color-text-secondary)]">Tekrar dene</button></div>;
}
