"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronDown, FileText, Info, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardMascot } from "./DashboardMascot";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDeadlineDate, formatRemainingTime, getDeadlineStatus } from "@/lib/utils/deadline";
import type { projectWork, DashboardMilestone } from "@/lib/projects/dashboard";
import styles from "./FreelancerDashboard.module.css";
import { PanelBadge as Badge, PanelSection as Section, PanelKpi, PanelAction, panelRootClass, type PanelTone as Tone } from "./PanelPrimitives";

export type DashboardPerson = { id: string; name: string | null; avatarUrl: string | null };
export type FreelancerProject = {
  id: string;
  title: string;
  status: string | null;
  deadline: string | null;
  team_required: boolean;
  client_id?: string | null;
  role: string | null;
  amount: number | null;
  work: ReturnType<typeof projectWork>;
  currentMilestone: DashboardMilestone | null;
  client?: DashboardPerson | null;
  team?: DashboardPerson[];
};
export type FreelancerOpportunity = {
  id: string; title: string; role: string; score: number;
  budgetPerPerson: number | null; duration: string | null;
};
export type FreelancerDashboardData = {
  profile: { first_name: string | null } | null;
  activeProjects: FreelancerProject[];
  waitingProjects: FreelancerProject[];
  pendingInvitations: number;
  pendingProposals: number;
  shortlistedProposals: number;
  recentProposals: Array<{
    id: string; project_id: string; status: string | null;
    bid_amount: number | string | null; created_at: string;
    project: { id: string; title: string; status: string | null; deadline: string | null; team_required: boolean } | null;
  }>;
  appliedProjectIds: string[];
  deliveries: Array<{ milestone: DashboardMilestone; projectId: string; projectTitle: string }>;
  earnings: { monthly: number; approved: number; remaining: number; completed: number; missingAmounts: boolean };
};

// Presentation copy only; workflow actions and permissions are unchanged.
function compactNextStep(project: FreelancerProject): string {
 const { workflow } = project.work;
 const milestone = project.currentMilestone;
 if (project.status === "open") return "Ekibin tamamlanması bekleniyor";
 if (project.status === "ready_to_start") return "Müşterinin projeyi başlatması bekleniyor";
 if (project.status === "paused") return "Açık talebi takip et";
 if (project.status !== "in_progress") return workflow.nextStep;
 if (workflow.currentUserMustAct && milestone) {
  if (milestone.status === "revision") return "Revizyonu yeniden teslim et";
  if (milestone.status === "pending") return "Sıradaki aşamayı başlat";
  if (milestone.status === "active") return "Çalışmanı teslim et";
 }
 if (workflow.currentUserMustAct && workflow.state === "Aşamalar tanımlanmadı") return "İlk aşamanı oluştur";
 if (milestone?.status === "submitted" || milestone?.status === "in_review") return "Müşteri incelemesi bekleniyor";
 if (workflow.state === "Tüm aşamalar onaylandı") return "Müşterinin projeyi tamamlaması bekleniyor";
 if (workflow.actionOwner === "Client") return "Müşteri aksiyonu bekleniyor";
 if (!workflow.currentUserMustAct) return "Diğer aşamanın tamamlanması bekleniyor";
 return workflow.nextStep;
}
function Deadline({ value }: { value: string | null }) {
  const remaining = formatRemainingTime(value);
  const tone: Tone = remaining.overdue ? "danger" : remaining.days !== null && remaining.days <= 2 ? "warning" : "neutral";
  return <span className={styles.deadline} data-tone={tone}><CalendarDays size={16} aria-hidden="true" />{formatDeadlineDate(value) ?? "Tarih belirtilmemiş"}</span>;
}

function ProjectCard({ project, defaultExpanded }: { project: FreelancerProject; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const triggerId = useId();
  const { work } = project;
  const href = `/freelancers/projects/${project.id}`;
  const team = project.team ?? [];
  const clientName = project.client?.name ?? "Proje sahibi";
  const progress = work.totalMilestones ? Math.round(work.approvedMilestones / work.totalMilestones * 100) : 0;
  return (
    <article className={styles.projectCard}>
      <button type="button" className={styles.projectTop} id={triggerId} aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(value => !value)}>
        <span className={styles.projectTitle}>
          <span className={styles.projectName}>{project.title}</span>
          <span className={styles.role}>{project.role ?? "Rol belirtilmemiş"}</span>
        </span>
        <Badge >
          {project.currentMilestone?.status === "revision" ? "Revizyon" : project.status === "paused" ? "Duraklatıldı" : "Aktif"}
        </Badge>
        <span className={styles.projectMeta}>
          <span>{formatDeadlineDate(project.currentMilestone?.due_date ?? project.deadline) ?? "Tarih belirtilmemiş"}</span>
          <strong>{project.amount === null ? "Belirtilmemiş" : formatCurrency(project.amount)}</strong>
        </span>
        <ChevronDown className={styles.chevron} aria-hidden="true" />
      </button>
      <div id={panelId} role="region" aria-labelledby={triggerId} aria-hidden={!expanded} inert={!expanded} className={styles.projectPanel} data-expanded={expanded}>
        <div className={styles.projectPanelInner}>
          <div className={styles.projectMetadata}>
            <div className={styles.ownerBlock}>
              <span className={styles.microLabel}>Proje sahibi</span>
              <div className={styles.client}>
                <Avatar src={project.client?.avatarUrl} name={clientName} size="sm" className={styles.personAvatar} />
                <span>{clientName}</span>
              </div>
            </div>
            <div className={styles.stageBlock}>
              <div className={styles.progressLabel}>
                <span>{work.totalMilestones ? `${work.approvedMilestones} / ${work.totalMilestones} aşama onaylandı` : "Aşamalar henüz tanımlanmadı"}</span>
              </div>
              {work.totalMilestones > 0 && <div className={styles.progressRow}>
                <progress className={styles.progress} aria-label={`${project.title}: onaylanan aşamalar`} max={work.totalMilestones} value={work.approvedMilestones} />
                <strong>%{progress}</strong>
              </div>}
              <div className={styles.projectDetails}>
                <span className={styles.microLabel}>Mevcut aşama</span>
                <strong>{compactNextStep(project)}</strong>
              </div>
            </div>
            <div className={styles.teamBlock}>
              <span className={styles.microLabel}>Ekip</span>
              {team.length > 0 ? <div className={styles.team}>
                <div className={styles.avatarStack} aria-label={`${team.length} kişilik proje ekibi`}>
                  {team.slice(0, 2).map(person => <Avatar key={person.id} src={person.avatarUrl} name={person.name ?? "Ekip üyesi"} size="sm" className={styles.personAvatar} />)}
                  {team.length > 2 && <span className={styles.extraPeople}>+{team.length - 2}</span>}
                </div>
                <span>{team.length} kişilik ekip</span>
              </div> : <span className={styles.microLabel}>Ekip bilgisi yok</span>}
            </div>
          </div>
          <div className={styles.projectFooter}>
            <PanelAction href={href} className={styles.buttonSecondary}>Çalışma alanına git<ArrowRight size={16} aria-hidden="true" /></PanelAction>
          </div>
        </div>
      </div>
    </article>
  );
}

export function FreelancerDashboardView({
  data, opportunities, opportunitiesLoading, opportunityError,
}: {
  data: FreelancerDashboardData;
  opportunities: FreelancerOpportunity[];
  opportunitiesLoading: boolean;
  opportunityError: string;
}) {
  const upcoming = [...data.activeProjects, ...data.waitingProjects].sort((a, b) => {
    const action = Number(b.work.workflow.currentUserMustAct) - Number(a.work.workflow.currentUserMustAct);
    return action || (Date.parse(a.currentMilestone?.due_date ?? a.deadline ?? "") || Infinity) - (Date.parse(b.currentMilestone?.due_date ?? b.deadline ?? "") || Infinity);
  });
  const actionCount = upcoming.filter(project => project.work.workflow.currentUserMustAct).length + data.pendingInvitations;
  const name = data.profile?.first_name?.trim();
  const deliveries = [...data.deliveries]
    .filter(item => item.milestone.due_date && item.milestone.status !== "approved")
    .sort((a, b) => Date.parse(a.milestone.due_date!) - Date.parse(b.milestone.due_date!))
    .slice(0, 4);
  const stats = [
    { label: "Aktif İşler", value: String(data.activeProjects.length), detail: "Devam eden proje" },
    { label: "Bekleyen İşlemler", value: String(actionCount), detail: "İşlem bekliyor" },
    { label: "Teklif & Davet", value: String(data.pendingProposals + data.pendingInvitations), detail: "Açık teklif ve davet" },
    { label: "Beklenen Kazanç", value: formatCurrency(data.earnings.remaining), detail: data.earnings.missingAmounts ? "Eksik tutar bilgisi" : "Bekleyen iş değeri" },
  ];
  return (
    <div className={[panelRootClass, styles.dashboard].join(" ")}>
      <header className={styles.welcome}>
        <div className={styles.welcomeGroup}>
          <div className={styles.welcomeCopy}>
            <h1>{name ? "Hoş geldin, " + name : "Hoş geldin"}</h1>
            <p>İşlerini, teslimlerini ve sana uygun fırsatları takip et.</p>
          </div>
        </div>
        <div className={styles.welcomeActions}><DashboardMascot pose="wave" size={80} className={styles.wave} eager />
          <PanelAction href="/freelancers/discover" variant="primary" className={styles.buttonPrimary}>Projeleri keşfet<ArrowRight size={16} aria-hidden="true" /></PanelAction>
        </div>
      </header>

      <dl className={styles.stats}>
        {stats.map(stat => <PanelKpi key={stat.label} {...stat} />)}
      </dl>

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          <Section title="Sıradaki İşler" count={upcoming.length}>
            {upcoming.length ? (
              <div className={styles.taskList}>
                {upcoming.slice(0, 3).map(project => (
                  <div key={project.id} className={styles.taskRow}>
                    <div className={styles.taskInfo}>
                      <Link href={`/freelancers/projects/${project.id}`} className={styles.itemTitle}>{project.title}</Link>
                      <p className={styles.taskSecondary}><span>{project.role ?? "Rol belirtilmemiş"}</span><span aria-hidden="true"> · </span>{compactNextStep(project)}</p>
                    </div>
                    <div className={styles.taskActions}>
                      <Badge >{project.work.workflow.state}</Badge>
                      <Deadline value={project.currentMilestone?.due_date ?? project.deadline} />
                      <Link href={`/freelancers/projects/${project.id}`} className={styles.textLink}>
                        {project.work.workflow.currentUserMustAct ? "Çalışma alanına git" : "Projeyi takip et"}<ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ))}
                {upcoming.length > 3 && <Link href="/freelancers/projects" className={styles.moreLink}>Tümünü gör<ArrowRight size={16} aria-hidden="true" /></Link>}
              </div>
            ) : <p className={styles.quietState}>Şu an bekleyen bir işin yok. Yeni fırsatlara göz atabilirsin.</p>}
          </Section>

          <Section title="Aktif Projeler" count={data.activeProjects.length} href="/freelancers/projects">
            {data.activeProjects.length ? (
              <div className={styles.projectList}>{data.activeProjects.map((project, index) => <ProjectCard key={project.id} project={project} defaultExpanded={index === 0} />)}</div>
            ) : (
              <div className={styles.emptyProjects}>
                <DashboardMascot pose="laptop" size={112} />
                <div><h3>Henüz aktif projen yok</h3><p>Sana uygun projeleri keşfedebilir veya gelen davetleri inceleyebilirsin.</p>
                  <PanelAction href="/freelancers/discover" className={styles.buttonSecondary}>Projeleri keşfet<ArrowRight size={16} aria-hidden="true" /></PanelAction>
                </div>
              </div>
            )}
          </Section>

          <Section title="Teklifler & Davetler" href="/freelancers/proposals">
            {data.pendingInvitations > 0 || data.pendingProposals > 0 ? (
              <div className={styles.proposals}>
                <div className={styles.proposalSummary}>
                  <Link href="/freelancers/proposals?tab=received" className={styles.proposalCount}><strong>{data.pendingInvitations}</strong><span>Yeni davet</span></Link>
                  <div className={styles.proposalCount}><strong>{data.pendingProposals - data.shortlistedProposals}</strong><span>Müşteri kararında</span></div>
                  <div className={styles.proposalCount}><strong>{data.shortlistedProposals}</strong><span>Kısa listede</span></div>
                </div>
                {data.pendingInvitations > 0 && <Link href="/freelancers/proposals?tab=received" className={styles.invitationLink}>{data.pendingInvitations} davetini incele ve yanıtla<ArrowRight size={16} aria-hidden="true" /></Link>}
                {data.recentProposals.map(proposal => (
                  <div key={proposal.id} className={styles.proposalRow}>
                    <Link href={`/freelancers/proposals/${proposal.id}`} className={styles.itemTitle}>{proposal.project?.title ?? "Teklif detayını gör"}</Link>
                    <Badge tone={proposal.status === "shortlisted" ? "info" : "warning"}>{proposal.status === "shortlisted" ? "Kısa listede" : "Müşteri kararında"}</Badge>
                  </div>
                ))}
              </div>
            ) : <div className={styles.proposalEmpty}><span className={styles.emptyIcon}><FileText aria-hidden="true" /></span><div><strong>Henüz aktif teklif veya davet yok.</strong><p>Sana uygun bir proje bulduğunda ilk teklifini gönderebilirsin.</p></div><PanelAction href="/freelancers/discover">Projeleri keşfet<ArrowRight size={16} aria-hidden="true" /></PanelAction></div>}
          </Section>
        </div>

        <aside className={styles.sideColumn} aria-label="Fırsatlar ve teslimler">
          <Section title="Sana Uygun Projeler" className={styles.suggestions}>
            <div className={styles.suggestionIntro}>
              <p><Sparkles size={16} aria-hidden="true" />Profilinle eşleşen fırsatlar</p>
              <DashboardMascot pose="search" size={76} className={styles.searchMascot} eager />
            </div>
            {opportunitiesLoading ? <p role="status" className={styles.suggestionState}>Sana uygun roller aranıyor…</p>
              : opportunityError ? <div role="status" className={styles.suggestionState}><p>{opportunityError}</p></div>
              : opportunities.length ? (
                <div className={styles.opportunityList}>
                  {opportunities.slice(0, 3).map(project => (
                    <Link key={project.id} href={`/freelancers/discover/${project.id}`} className={styles.opportunity}>
                      <div className={styles.opportunityTop}><span>{project.role}</span><Badge tone="info">%{project.score} uyum</Badge></div>
                      <h3>{project.title}</h3>
                      <p>{project.budgetPerPerson === null ? "Rol bütçesi belirtilmemiş" : formatCurrency(project.budgetPerPerson)}<span>·</span>{project.duration ?? "Süre belirtilmemiş"}</p>
                    </Link>
                  ))}
                </div>
              ) : <div className={styles.suggestionState}><strong>Henüz güçlü bir eşleşme yok.</strong><p>Yeni projeler yayınlandıkça burada sana uygun fırsatları göstereceğiz.</p></div>}
            <Link href="/freelancers/discover" className={styles.suggestionFooter}>Tüm fırsatları keşfet<ArrowRight size={16} aria-hidden="true" /></Link>
          </Section>

          <Section title="Yaklaşan Teslimler" href="/freelancers/projects" label="Takip et">
            {deliveries.length ? (
              <div className={styles.deliveryList}>
                {deliveries.map(item => {
                  const status = getDeadlineStatus({ dueDate: item.milestone.due_date, status: item.milestone.status });
                  const tone: Tone = status === "overdue" ? "danger" : status === "due_soon" ? "warning" : "neutral";
                  const date = new Date(item.milestone.due_date!);
                  return (
                    <Link key={item.milestone.id} href={`/freelancers/projects/${item.projectId}`} className={styles.delivery} data-tone={tone}>
                      <div className={styles.dateTile}><strong>{date.getDate()}</strong><span>{date.toLocaleDateString("tr-TR", { month: "short" })}</span></div>
                      <div><h3>{item.milestone.title}</h3><p>{item.projectTitle}</p>
                        <Badge tone={tone}>{status === "overdue" ? "Gecikti" : status === "due_soon" ? "Teslim yaklaşıyor" : item.milestone.status === "submitted" || item.milestone.status === "in_review" ? "İncelemede" : "Planlandı"}</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : <p className={styles.quietState}>Tarihi belirlenmiş bekleyen bir teslimin yok.</p>}
          </Section>

          <Section title="Kazanç Özeti" href="/freelancers/earnings" label="Detay">
            <dl className={styles.earnings}>
              <div><dt>Aktif işlerin değeri</dt><dd>{formatCurrency(data.earnings.approved + data.earnings.remaining)}</dd></div>
              <div><dt>Onaylanan hakediş</dt><dd>{formatCurrency(data.earnings.approved)}</dd></div>
              <div><dt>Beklenen iş değeri</dt><dd>{formatCurrency(data.earnings.remaining)}</dd></div>
              <div><dt>Bu ay onaylanan iş</dt><dd>{formatCurrency(data.earnings.monthly)}</dd></div>
            </dl>
            <div className={styles.paymentNote}><Info aria-hidden="true" /><div><strong>Ödeme altyapısı aktif değil</strong><p>İş değeri özeti; ödeme gerçekleştiğini göstermez.{data.earnings.missingAmounts && " Eksik tutarlar hariç."}</p></div></div>
          </Section>
        </aside>
      </div>
    </div>
  );
}
