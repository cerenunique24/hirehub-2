import Link from "next/link";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
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

function ProjectCard({ project }: { project: FreelancerProject }) {
  const { work } = project;
  const href = `/freelancers/projects/${project.id}`;
  const team = project.team ?? [];
  const clientName = project.client?.name ?? "Proje sahibi";
  const progress = work.totalMilestones ? Math.round(work.approvedMilestones / work.totalMilestones * 100) : 0;
  return (
    <article className={styles.projectCard}>
      <div className={styles.projectTop}>
        <div className={styles.projectTitle}>
          <Link href={href}>{project.title}</Link>
          <span className={styles.role}>{project.role ?? "Rol belirtilmemiş"}</span>
        </div>
        <Badge >
          {project.currentMilestone?.status === "revision" ? "Revizyon" : project.status === "paused" ? "Duraklatıldı" : "Aktif"}
        </Badge>
      </div>
      <div className={styles.people}>
        <div className={styles.client}>
          <Avatar src={project.client?.avatarUrl} name={clientName} size="sm" className={styles.personAvatar} />
          <span>{clientName}</span>
        </div>
        {team.length > 0 && (
          <div className={styles.team}>
            <div className={styles.avatarStack} aria-label={`${team.length} kişilik proje ekibi`}>
              {team.slice(0, 3).map(person => <Avatar key={person.id} src={person.avatarUrl} name={person.name ?? "Ekip üyesi"} size="sm" className={styles.personAvatar} />)}
              {team.length > 3 && <span className={styles.extraPeople}>+{team.length - 3}</span>}
            </div>
            <span>{team.length} kişilik ekip</span>
          </div>
        )}
      </div>
      <div className={styles.progressLabel}>
        <span>{work.totalMilestones ? `${work.approvedMilestones}/${work.totalMilestones} aşama onaylandı` : "Aşamalar henüz tanımlanmadı"}</span>
        {work.totalMilestones > 0 && <strong>%{progress}</strong>}
      </div>
      {work.totalMilestones > 0 && <progress className={styles.progress} aria-label={`${project.title}: onaylanan aşamalar`} max={work.totalMilestones} value={work.approvedMilestones} />}
      <div className={styles.projectDetails}>
        <div><span className={styles.microLabel}>Mevcut aşama</span><strong>{project.currentMilestone?.title ?? work.workflow.state}</strong></div>
        <div><span className={styles.microLabel}>Anlaşma tutarın</span><strong>{project.amount === null ? "Belirtilmemiş" : formatCurrency(project.amount)}</strong></div>
      </div>
      <div className={styles.projectFooter}>
        <Deadline value={project.currentMilestone?.due_date ?? project.deadline} />
        <PanelAction href={href} className={styles.buttonSecondary}>Çalışma alanına git<ArrowRight size={16} aria-hidden="true" /></PanelAction>
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
                      <span className={styles.roleText}>{project.role ?? "Rol belirtilmemiş"}</span>
                      <p>{compactNextStep(project)}</p>
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
              <div className={styles.projectList}>{data.activeProjects.map(project => <ProjectCard key={project.id} project={project} />)}</div>
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
            ) : <div className={styles.quietState}><strong>Henüz teklif veya davet yok</strong><p>Sana uygun bir proje bulduğunda ilk teklifini gönderebilirsin.</p><Link href="/freelancers/discover" className={styles.textLink}>Fırsatları keşfet<ArrowRight size={16} aria-hidden="true" /></Link></div>}
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
              ) : <p className={styles.suggestionState}>Şu an yüksek uyumlu bir öneri yok. Yayındaki diğer projeleri keşfedebilirsin.</p>}
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
            <div className={styles.paymentNote}><Badge>Ödeme altyapısı aktif değil</Badge><p>İş değeri özeti; ödeme gerçekleştiğini göstermez.{data.earnings.missingAmounts && " Eksik tutarlar hariç."}</p></div>
          </Section>
          <Link href="/freelancers/profile" className={styles.profileLink}>Profilini ve çalışma uygunluğunu düzenle<ArrowRight size={16} aria-hidden="true" /></Link>
        </aside>
      </div>
    </div>
  );
}
