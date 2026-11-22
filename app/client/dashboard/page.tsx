"use client";

import { buttonClasses } from "@/components/ui/Button";
import { pageHeaderClass } from "@/components/ui/PageHeader";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight, CalendarDays, ChevronDown, Clock3, Coins, Info,
  FolderKanban, Plus, UsersRound, FileText,
} from "lucide-react";

import styles from "./Dashboard.module.css";

import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { PanelBadge } from "@/components/dashboard/PanelPrimitives";
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
  openRoles?: Array<{ role: string; remaining: number }>;
};

type Activity = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  created_at: string;
};

type Profile = { first_name: string | null };
type SentInvitation = { id: string; project_id: string; role: string | null; status: string | null; created_at: string; projectTitle?: string };
type CostSummary = { approved: number | null; pending: number | null; monthly: number | null; incomplete: boolean };

type DashboardData = {
  profile: Profile | null;
  projectCount: number;
  drafts: ClientProject[];
  activeProjects: ProjectCard[];
  readyProjects: ProjectCard[];
  openProjects: ProjectCard[];
  activities: Activity[];
  invitations?: SentInvitation[];
  invitationCount?: number | null;
  invitationError?: boolean;
  costs?: CostSummary;
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

      const [teamResult, milestoneResult, proposalResult, activityResult, invitationResult] = await Promise.all([
        projectIds.length
          ? supabase
              .from("project_team_members")
              .select("project_id, freelancer_id, role, agreed_amount")
              .in("project_id", projectIds)
              .eq("status", "active")
          : Promise.resolve({ data: [] as TeamMember[], error: null }),
        projects.length
          ? supabase
              .from("project_milestones")
              .select("id, project_id, title, due_date, status, sort_order, freelancer_id, client_total_amount, approved_at")
              .in("project_id", projects.map(project=>project.id))
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
        supabase.from("project_team_invitations")
          .select("id, project_id, role, status, created_at", {count:"exact"})
          .eq("client_id", user.id).order("created_at", {ascending:false}).limit(3),
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
          openRoles: team.roles.filter(role=>!role.isFull).map(role=>({role:role.role,remaining:Math.max(0,role.capacity-role.filled)})),
        };
      });

      // Only persisted client amounts represent the client-side value; absent amounts stay unknown.
      const financialRows = (milestoneResult.data ?? []) as Array<DashboardMilestone & {client_total_amount:number|string|null;approved_at:string|null}>;
      const relevantRows = financialRows.filter(row=>projects.some(project=>project.id===row.project_id && project.status!=="cancelled"));
      const monthKey = (date:Date)=>new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",timeZone:"Europe/Istanbul"}).format(date);
      const currentMonth = monthKey(new Date());
      const sumKnown = (rows:typeof relevantRows) => rows.length && rows.every(row=>knownAmount(row.client_total_amount)===null) ? null : rows.reduce((sum,row)=>sum+(knownAmount(row.client_total_amount)??0),0);
      const pendingValues = cards.filter(project=>["in_progress","paused"].includes(project.status??"")).map(project=>{
        const approvedRows = relevantRows.filter(row=>row.project_id===project.id && row.status==="approved");
        const approved = approvedRows.some(row=>knownAmount(row.client_total_amount)===null) ? null : sumKnown(approvedRows);
        return project.cost===null || approved===null ? null : Math.max(project.cost-approved,0);
      });
      const missingApprovalDate = relevantRows.some(row=>row.status==="approved" && (!row.approved_at || !Number.isFinite(Date.parse(row.approved_at))));
      const costs:CostSummary = {
        approved:sumKnown(relevantRows.filter(row=>row.status==="approved")),
        pending:pendingValues.length && pendingValues.every(value=>value===null) ? null : pendingValues.reduce<number>((sum,value)=>sum+(value??0),0),
        monthly:missingApprovalDate ? null : sumKnown(relevantRows.filter(row=>row.status==="approved" && row.approved_at && Number.isFinite(Date.parse(row.approved_at)) && monthKey(new Date(row.approved_at))===currentMonth)),
        incomplete:missingApprovalDate || pendingValues.some(value=>value===null) || relevantRows.some(row=>knownAmount(row.client_total_amount)===null),
      };
      if (active) {
        setData({
          profile: Array.isArray(profileResult.data) ? (profileResult.data[0] as Profile | undefined) ?? null : null,
          projectCount: projects.length,
          drafts: projects.filter((project) => project.status === "draft"),
          activeProjects: cards.filter((project) => project.status === "in_progress" || project.status === "paused"),
          readyProjects: cards.filter((project) => project.status === "ready_to_start"),
          openProjects: cards.filter((project) => project.status === "open"),
          activities: (activityResult.data ?? []) as Activity[],
          invitations:invitationResult.error?[]:(invitationResult.data??[]).map(invitation=>({...invitation,projectTitle:projects.find(project=>project.id===invitation.project_id)?.title})),
          invitationCount:invitationResult.error?null:invitationResult.count??null,
          invitationError:Boolean(invitationResult.error),
          costs,
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
  if (error) return <DashboardError message={error} retry={() => setReloadKey(key => key + 1)} />;
  if (!data) return null;
  const allProjects = [...data.readyProjects, ...data.activeProjects, ...data.openProjects];
  const actions = allProjects.filter(project => project.work.workflow.currentUserMustAct || project.proposalCount > 0 || project.work.overdueMilestones.length > 0 || Boolean(project.openRoles?.length));
  const activeCost = data.activeProjects.reduce((total, project) => total + (project.cost ?? 0), 0);
  const activeCostMissing = data.activeProjects.some(project => project.missingCost);
  const pendingOffers = data.openProjects.reduce((total, project) => total + project.proposalCount, 0);
  const projectRows = Array.from(new Map([...data.activeProjects, ...data.readyProjects].map(project => [project.id, project])).values());
  const openings = data.openProjects.flatMap(project => (project.openRoles ?? []).map(role => ({...role,project})));
  const deadlineItems = data.activeProjects.flatMap(project => {const milestone=project.work.currentMilestone;const deadline=milestone?.due_date??project.deadline;return deadline && Number.isFinite(Date.parse(deadline)) ? [{project,milestone,deadline}] : [];}).sort((a,b)=>Date.parse(a.deadline)-Date.parse(b.deadline)).slice(0,4);
  return <div className={styles.dashboard}>
    <header className={pageHeaderClass + " " + styles.welcome}><div><h1 className={styles.pageTitle}>Merhaba{data.profile?.first_name ? `, ${data.profile.first_name}` : ""}</h1><p>Projelerindeki ilerlemeyi ve bekleyen kararları buradan yönet.</p></div><Link href="/client/projects/new" className={buttonClasses({variant:"primary"})}><Plus size={16} aria-hidden />Yeni Proje Oluştur</Link></header>
    <section aria-label="Proje özeti" className={styles.kpiGrid}>
      <KpiCard icon={<FileText />} label="Aktif Projeler" value={data.activeProjects.length} detail="Devam eden proje" />
      <KpiCard icon={<Clock3 />} label="Karar Bekleyen" value={actions.length} detail="Karar veya inceleme bekleyen proje" />
      <KpiCard icon={<FileText />} label="Yeni Teklifler" value={pendingOffers} detail="Değerlendirilmeyi bekleyen teklif" />
      <KpiCard icon={<Coins />} label="Aktif Proje Maliyeti" value={activeCostMissing ? "—" : formatCurrency(activeCost)} detail={activeCostMissing ? "Maliyet bilgisi eksik" : "Hizmet bedeli dahil"} />
    </section>
    <div className={styles.columns}>
      <div className={styles.main}>
      <DashboardSection className={styles.decisions} title="Sıradaki Kararlar" icon={<Clock3 size={18} />} count={actions.length} description="Projelerinde seni bekleyen karar ve inceleme adımları." href="/client/projects">
        {actions.length ? <div className={styles.decisionList}>{actions.slice(0,4).map(project=><DecisionRow key={project.id} project={project} />)}</div> : <p className={styles.quiet}>Şu anda senden karar bekleyen bir işlem yok.</p>}
      </DashboardSection>
      <DashboardSection className={styles.projects} title="Aktif Projeler" icon={<FileText size={18} />} count={projectRows.length} description="Devam eden projelerini ve ekip durumunu takip et." href="/client/projects">
        <ClientProjectAccordion projects={projectRows} />
        {!projectRows.length && <SmallEmpty icon={<FolderKanban size={24}/>} title={data.projectCount ? "Aktif projen yok" : "Henüz bir projen yok"} description="Projelerinin ilerlemesini burada takip edebilirsin." actionHref={data.projectCount ? "/client/projects" : "/client/projects/new"} action={data.projectCount ? "Projeleri gör" : "Proje oluştur"}/>}
        {data.drafts.length > 0 && <details className={styles.drafts}><summary>Taslak projelerin <span>{data.drafts.length}</span></summary>{data.drafts.slice(0,3).map(project=><div className={styles.compactRow} key={project.id}><div><h3>{project.title}</h3><p>Henüz yayınlanmadı</p></div><Link href={`/client/projects/${project.id}`}>Devam et <ArrowRight size={14} aria-hidden /></Link></div>)}</details>}
      </DashboardSection>
      <DashboardSection className={styles.offers} title="Teklifler & Davetler" icon={<FileText size={18} />} description="Gelen teklifleri değerlendir veya freelancerlara davet gönder." href="/client/proposals"><ProposalPreview projects={data.openProjects} count={pendingOffers} invitations={data.invitations ?? []} invitationCount={data.invitationCount ?? null} invitationError={Boolean(data.invitationError)} /></DashboardSection>
      </div><div className={styles.aside}>
      <AsideCard className={styles.roles} title="Açık Roller" icon={<UsersRound size={18}/>} count={openings.reduce((sum,row)=>sum+row.remaining,0)} href="/client/projects"><p className={styles.railIntro}>Bu projelerde hâlâ doldurulması gereken roller.</p>{openings.length ? <><div className={styles.roleList}>{openings.slice(0,4).map(({project,role,remaining})=><Link href={"/client/freelancers"} key={project.id+role} className={styles.roleRow}><UsersRound size={19} aria-hidden /><div><h3>{role}{remaining>1 && <span> · {remaining} kişi</span>}</h3><p>{project.title}</p></div><ArrowRight size={14} aria-hidden /></Link>)}</div><Link className={styles.railFooter} href="/client/projects">Tüm rolleri gör <ArrowRight size={15} aria-hidden /></Link></> : <p className={styles.quiet}>{data.openProjects.some(project=>project.team_required&&!project.roles.length) ? "Bazı projelerin rol bilgisi henüz belirtilmemiş." : "Şu anda doldurulmayı bekleyen bir rol bulunmuyor."}</p>}</AsideCard>
      <AsideCard className={styles.deadlines} title="Yaklaşan Son Tarihler" icon={<Clock3 size={18}/>} href="/client/projects">{deadlineItems.length ? deadlineItems.map(({project,milestone,deadline})=><DeadlineItem key={project.id} project={project} milestone={milestone} deadline={deadline}/>) : <p className={styles.quiet}>Aktif projelerde yaklaşan bir son tarih yok.</p>}</AsideCard>
      <AsideCard className={styles.costs} title="Maliyet Özeti" icon={<Coins size={18}/>} href="/client/payments" linkLabel="Detay"><dl className={styles.costRows}><div><dt>Aktif projelerin maliyeti</dt><dd>{activeCostMissing ? "—" : formatCurrency(activeCost)}</dd></div><div><dt>Onaylanan iş değeri</dt><dd>{money(data.costs?.approved)}</dd></div><div><dt>Bekleyen iş değeri</dt><dd>{money(data.costs?.pending)}</dd></div><div><dt>Bu ay onaylanan iş</dt><dd>{money(data.costs?.monthly)}</dd></div></dl><div className={styles.costNotice}><Info size={18} aria-hidden /><div><strong>Ödeme altyapısı aktif değil</strong><p>İş değeri özeti; ödeme gerçekleştiğini göstermez. Eksik tutarlar hariç.</p>{(activeCostMissing || data.costs?.incomplete) && <p>Bazı kayıtlarda tutar veya onay tarihi eksik.</p>}</div></div></AsideCard>
      </div>
    </div>
  </div>;
}

function money(value:number|null|undefined){return value==null ? "—" : formatCurrency(value);}
function KpiCard({icon,label,value,detail}:{icon:ReactNode;label:string;value:number|string;detail:string}) {
  return <div className={styles.kpi}><span className={styles.kpiIcon} aria-hidden>{icon}</span><div><p>{label}</p><strong>{value}</strong><span className={styles.kpiDetail}>{detail}</span></div></div>;
}
function DashboardSection({title,description,href,icon,count,children,className=""}:{title:string;description:string;href?:string;icon:ReactNode;count?:number;children:ReactNode;className?:string}) {
  return <section className={styles.section+" "+className}><div className={styles.sectionHeader}><div><h2>{icon}{title}{count!==undefined && <span className={styles.count}>{count}</span>}</h2><p>{description}</p></div>{href && <Link href={href} className={styles.textLink}>Tümünü gör</Link>}</div>{children}</section>;
}
function AsideCard({title,icon,href,children,count,className="",linkLabel="Tümünü gör"}:{title:string;icon:ReactNode;href?:string;children:ReactNode;count?:number;className?:string;linkLabel?:string}) {
  return <section className={styles.asideCard+" "+className}><div className={styles.asideHeader}><h2>{icon}{title}{count!==undefined&&<span className={styles.count}>{count}</span>}</h2>{href&&<Link className={styles.textLink} href={href}>{linkLabel}</Link>}</div>{children}</section>;
}
function DecisionRow({project}:{project:ProjectCard}) {
  const gap=project.openRoles?.reduce((sum,row)=>sum+row.remaining,0)??0;
  const reason=project.proposalCount>0||project.status==="ready_to_start"||project.work.workflow.currentUserMustAct||project.work.overdueMilestones.length ? actionReason(project) : `${gap} rol henüz doldurulmadı`;
  const label=project.work.workflow.currentUserMustAct||project.proposalCount>0||project.status==="ready_to_start" ? actionType(project) : gap ? "Rol açığı var" : actionType(project);
  const staffing=gap>0&&!project.work.workflow.currentUserMustAct&&!project.proposalCount;
  return <div className={styles.decisionRow}><FileText size={20} aria-hidden /><div className={styles.decisionCopy}><h3>{project.title}</h3><p>{reason}</p><span className={styles.rowDate}><CalendarDays size={13} aria-hidden />{project.deadline?formatDeadlineDate(project.deadline):"Tarih belirlenmedi"}</span></div><div className={styles.decisionActions}><div className={styles.decisionMeta}><PanelBadge tone={gap?"danger":project.work.workflow.currentUserMustAct?"warning":"info"}>{label}</PanelBadge></div><Link className={styles.textLink} href={staffing?"/client/freelancers":`/client/projects/${project.id}`}>{staffing?"Freelancer bul":project.work.workflow.state==="Teslim müşteri incelemesinde"?"Teslimi incele":actionCta(project)}<ArrowRight size={15} aria-hidden /></Link></div></div>;
}
function ClientProjectAccordion({projects}:{projects:ProjectCard[]}) {
  const [openId,setOpenId]=useState("");
  return <div className={styles.projectList}>{projects.map(project=><ClientProjectAccordionRow key={project.id} project={project} expanded={openId===project.id} onToggle={()=>setOpenId(openId===project.id?"":project.id)} />)}</div>;
}
function ClientProjectAccordionRow({project,expanded,onToggle}:{project:ProjectCard;expanded:boolean;onToggle:()=>void}) {
  const progress=project.work.totalMilestones?Math.round(project.work.approvedMilestones/project.work.totalMilestones*100):0;
  const panelId=`dashboard-project-${project.id}`;
  return <article className={styles.projectRow}><button type="button" id={panelId+"-toggle"} aria-expanded={expanded} aria-controls={panelId} onClick={onToggle} className={styles.projectToggle}><FileText size={20} aria-hidden /><span className={styles.rowIdentity}><strong>{project.title}</strong><span className={styles.rowContext}><span className={styles.projectType}>{project.team_required?"Ekip Projesi":"Tek Freelancer"}</span><span aria-hidden>·</span><span className={styles.rowDate}><CalendarDays size={13} aria-hidden />{project.deadline?formatDeadlineDate(project.deadline):"Tarih belirlenmedi"}</span></span></span><span className={styles.rowMetadata}><PanelBadge tone={project.status==="ready_to_start"?"warning":project.status==="paused"?"neutral":"success"}>{project.status==="ready_to_start"?"Başlangıç bekliyor":project.status==="paused"?"Duraklatıldı":"Aktif"}</PanelBadge><span className={styles.rowCost}>{project.cost===null?"Maliyet belirsiz":formatCurrency(project.cost)}</span><ChevronDown size={15} className={styles.rowChevron} aria-hidden /></span></button>
  <div id={panelId} role="region" aria-labelledby={panelId+"-toggle"} hidden={!expanded} className={styles.projectDetails}><div><p className={styles.detailLabel}>Ekip durumu</p><strong className={styles.teamValue}><UsersRound size={17} aria-hidden />{project.teamSummary}</strong><AvatarStack members={project.members}/></div><div className={styles.stageBlock}><div className={styles.progressLabel}><span>{project.work.totalMilestones?`${project.work.approvedMilestones} / ${project.work.totalMilestones} aşama onaylandı`:"Aşamalar henüz tanımlanmadı"}</span>{project.work.totalMilestones>0&&<strong>%{progress}</strong>}</div>{project.work.totalMilestones>0&&<progress value={project.work.approvedMilestones} max={project.work.totalMilestones} aria-label="Onaylanan aşamalar"/>}<p className={styles.detailLabel}>Mevcut aşama</p><strong>{project.work.currentMilestone?.title??project.work.workflow.state}</strong></div><div className={styles.pendingBlock}><p className={styles.detailLabel}>Bekleyen aksiyon</p><strong><Clock3 size={15} aria-hidden />{project.work.workflow.currentUserMustAct? actionType(project):"Şu an işlem beklenmiyor"}</strong><Link href={`/client/projects/${project.id}`} className={styles.projectLink}>Projeye git <ArrowRight size={14} aria-hidden /></Link></div></div></article>;
}
function ProposalPreview({projects,count,invitations=[],invitationCount=null,invitationError=false}:{projects:ProjectCard[];count:number;invitations?:SentInvitation[];invitationCount?:number|null;invitationError?:boolean}) {
  const [tab,setTab]=useState("received");
  return <><Tabs className={styles.tabs} items={[{value:"received",label:"Gelen Teklifler",count},{value:"sent",label:"Gönderilen Davetler",...(invitationCount!==null?{count:invitationCount}:{})}]} value={tab} onChange={setTab}/><div className={styles.proposalPanel} aria-label={tab==="received"?"Gelen teklifler":"Gönderilen davetler"}>
  {tab==="sent" ? invitationError ? <p className={styles.quiet} role="alert">Gönderilen davetler yüklenemedi. <Link href="/client/proposals">Davetlerini görüntüle</Link></p> : invitations.length ? invitations.map(invitation=><div className={styles.compactRow} key={invitation.id}><UsersRound size={20} aria-hidden /><div><h3>{invitation.projectTitle??"Proje daveti"}</h3><p>{invitation.role??"Rol belirtilmemiş"} · {({pending:"Yanıt bekliyor",accepted:"Kabul edildi",rejected:"Reddedildi",cancelled:"İptal edildi",expired:"Süresi doldu"} as Record<string,string>)[invitation.status??""]??invitation.status??"Durum bilinmiyor"}</p></div><Link href="/client/proposals">Görüntüle <ArrowRight size={14} aria-hidden /></Link></div>) : <SmallEmpty icon={<UsersRound size={27}/>} title="Henüz gönderilmiş davetin yok." description="Projelerine uygun freelancerları keşfedip davet edebilirsin." actionHref="/client/freelancers" action="Freelancer keşfet"/> : count>0 ? projects.filter(project=>project.proposalCount>0).slice(0,3).map(project=><div className={styles.compactRow} key={project.id}><FileText size={20} aria-hidden /><div><h3>{project.title}</h3><p>{project.proposalCount} teklif değerlendirilmeyi bekliyor</p></div><Link href={`/client/projects/${project.id}`}>İncele <ArrowRight size={14} aria-hidden /></Link></div>) : <SmallEmpty icon={<FileText size={27}/>} title="Şu anda yeni teklif bulunmuyor." description="Projeni yayınladıktan sonra yeteneklerden teklif alacaksın." actionHref="/client/freelancers" action="Freelancer keşfet"/>}
  </div></>;
}
function DeadlineItem({project,milestone,deadline}:{project:ProjectCard;milestone:DashboardMilestone|null;deadline:string}) {
  const remaining=formatRemainingTime(deadline),date=new Date(deadline);
  const status=milestone?getDeadlineStatus({dueDate:deadline,status:milestone.status}):remaining.overdue?"overdue":remaining.days!==null&&remaining.days<=2?"due_soon":"on_track";
  return <div className={styles.deadlineItem}><time dateTime={deadline} className={styles.dateTile} data-overdue={status==="overdue"}><strong>{date.getDate()}</strong><span>{date.toLocaleDateString("tr-TR",{month:"short"})}</span></time><div className={styles.deadlineText}><h3>{project.title}</h3><p>{milestone?.title??"Proje son tarihi"}</p><div className={styles.deadlineBottom}><PanelBadge tone={status==="overdue"?"danger":status==="due_soon"?"warning":"neutral"}>{remaining.label}</PanelBadge><Link href={`/client/projects/${project.id}`} className={styles.textLink}>Takip et <ArrowRight size={14} aria-hidden /></Link></div></div></div>;
}
function AvatarStack({members}:{members:TeamMember[]}) {
  return members.length ? <div className={styles.avatarStack}>{members.slice(0,4).map(member=><Avatar key={member.project_id+member.freelancer_id} src={member.avatar_url} name={member.first_name??member.role} size="sm"/>)}{members.length>4&&<span>+{members.length-4}</span>}</div> : null;
}
function SmallEmpty({icon,title,description,actionHref,action}:{icon:ReactNode;title:string;description:string;actionHref?:string;action?:string}) {
  return <div className={styles.smallEmpty}><span aria-hidden>{icon}</span><div><h3>{title}</h3><p>{description}</p>{actionHref&&<Link href={actionHref} className={styles.projectLink}>{action}<ArrowRight size={13} aria-hidden /></Link>}</div></div>;
}
function DashboardLoading(){return <div role="status" className={styles.loading}>Çalışma merkezi yükleniyor…</div>;}
function DashboardError({message,retry}:{message:string;retry:()=>void}){return <div role="alert" className={styles.error}><p>{message}</p><button type="button" onClick={retry}>Tekrar dene</button></div>;}
