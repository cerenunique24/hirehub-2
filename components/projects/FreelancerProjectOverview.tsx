"use client";

import { useState } from "react";
import Image from "next/image";
import { BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, Coins, FileText, Flag, Info, Layers, MessageCircle, UserRound } from "lucide-react";
import { PanelBadge } from "@/components/dashboard/PanelPrimitives";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { Milestone, MilestoneEvent } from "@/lib/projects/milestones";
import type { ProjectWorkflowState } from "@/lib/projects/workflow-state";
import { projectListDate, projectListStatus } from "./projectListPresentation";
import type { WorkroomProject } from "./ProjectWorkroom";
import styles from "./FreelancerProjectOverview.module.css";

const STAGE_LABEL: Record<Milestone["status"], string> = { pending: "Beklemede", active: "Devam ediyor", submitted: "İncelemede", in_review: "İncelemede", revision: "Revizyon istendi", approved: "Tamamlandı" };
const EVENT_LABEL: Record<MilestoneEvent["event_type"], string> = { submitted: "Aşama teslim edildi", resubmitted: "Revizyon teslim edildi", revision_requested: "Revizyon istendi", approved: "Aşama onaylandı" };

export function freelancerPayout(milestones: Milestone[], currentUserId: string | null, isTeamProject: boolean) {
  if (!currentUserId) return null;
  const own = isTeamProject ? milestones.filter(item => item.freelancer_id === currentUserId) : milestones;
  if (!own.length || own.some(item => item.freelancer_payout_amount == null || !Number.isFinite(Number(item.freelancer_payout_amount)))) return null;
  return own.reduce((sum, item) => sum + Number(item.freelancer_payout_amount), 0);
}

export function FreelancerProjectHeader({ project, personalRole, payout, clientName }: { project: WorkroomProject; personalRole: string | null; payout: number | null; clientName: string | null }) {
  const status = projectListStatus(project.status);
  return <header className={styles.header}><PanelBadge tone={status.tone}>{status.label}</PanelBadge><h1>{project.title}</h1><dl className={styles.headerMetadata}>
    <div><dt><BriefcaseBusiness size={20} aria-hidden />Rolün</dt><dd>{personalRole || "Rol bilgisi bulunmuyor"}</dd></div>
    <div><dt><Coins size={20} aria-hidden />Kazancın</dt><dd>{payout === null ? "Henüz belirlenmedi" : formatCurrency(payout)}</dd></div>
    <div><dt><CalendarDays size={20} aria-hidden />Son tarih</dt><dd>{projectListDate(project.deadline)}</dd></div>
    <div><dt><UserRound size={20} aria-hidden />Proje sahibi</dt><dd>{clientName ? clientName + " · Client" : "Proje sahibi bilgisi bulunmuyor"}</dd></div>
  </dl></header>;
}

export function FreelancerStatusBand({ project, milestones, workflow, loading, error }: { project: WorkroomProject; milestones: Milestone[]; workflow: ProjectWorkflowState; loading: boolean; error: string }) {
  const approved = milestones.filter(item => item.status === "approved").length;
  return <section className={styles.statusBand} aria-label="Şu anki durum" aria-live="polite" data-action-required={!loading && !error && workflow.currentUserMustAct}>
    <Image src="/images/mascots/projects-laptop.png" width={68} height={68} alt="" className={styles.mascot} />
    <div className={styles.statusCopy}><p className={styles.eyebrow}>Şu anki durum</p><h2>{loading ? "Durum yükleniyor" : error ? "Durum doğrulanamadı" : project.status === "ready_to_start" ? "Proje başlangıcı bekleniyor" : workflow.state}</h2><p>{loading ? "Proje aşamaları kontrol ediliyor." : error ? "Aşama bilgileri alınamadı; yeniden kontrol et." : workflow.nextStep}</p></div>
    {!loading && !error && <div className={styles.progress}><strong>Onaylanan aşamalar {approved} / {milestones.length}</strong>{milestones.length ? <progress value={approved} max={milestones.length} aria-label="Onaylanan aşamalar" /> : <span>Henüz aşama tanımlanmadı</span>}</div>}
    {project.requirements_confirmed_at && <div className={styles.requirements}><CheckCircle2 size={22} aria-hidden /><div><strong>Gereksinimler hazır</strong><span>{projectListDate(project.requirements_confirmed_at)}</span></div></div>}
  </section>;
}

export function projectActivities(project: WorkroomProject, events: MilestoneEvent[], milestones: Milestone[]) {
  const rows = events.map(event => ({ id: event.id, title: EVENT_LABEL[event.event_type], description: [milestones.find(item => item.id === event.milestone_id)?.title, event.actor_role === "client" ? "Client tarafından" : "Freelancer tarafından"].filter(Boolean).join(" · "), date: event.created_at, approved: event.event_type === "approved" }));
  if (project.requirements_confirmed_at) rows.push({ id: "requirements", title: "Gereksinimler onaylandı", description: "Client tarafından onaylandı.", date: project.requirements_confirmed_at, approved: true });
  if (project.created_at) rows.push({ id: "created", title: "Proje oluşturuldu", description: "Proje kaydı oluşturuldu.", date: project.created_at, approved: false });
  return rows.filter(row => Number.isFinite(Date.parse(row.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 6);
}

export default function FreelancerProjectOverview({ project, milestones, events, workflow, currentUserId, isTeamProject, loading, error, activityError, onMilestone }: {
  project: WorkroomProject; milestones: Milestone[]; events: MilestoneEvent[]; workflow: ProjectWorkflowState; currentUserId: string | null; isTeamProject: boolean; loading: boolean; error: string; activityError: boolean; onMilestone: (milestone: Milestone | null) => void;
}) {
  const [expanded, setExpanded] = useState(false), [skillsExpanded, setSkillsExpanded] = useState(false);
  const skills = project.skills ?? [], activities = projectActivities(project, events, milestones);
  const ownAction = milestones.find(item => (!isTeamProject || item.freelancer_id === currentUserId) && ["active", "revision"].includes(item.status));
  const ownPending = milestones.find(item => (!isTeamProject || item.freelancer_id === currentUserId) && item.status === "pending");
  const stage = ownAction ?? ownPending ?? milestones.find(item => item.status !== "approved") ?? milestones.at(-1);
  const canDeliver = Boolean(currentUserId) && !loading && !error && project.status === "in_progress" && Boolean(ownAction) && workflow.currentUserMustAct;
  const canCreate = Boolean(currentUserId) && !loading && !error && project.status === "in_progress" && !milestones.length && isTeamProject && workflow.currentUserMustAct;
  const canInspect = Boolean(currentUserId) && !loading && !error && workflow.currentUserMustAct && !canDeliver && !canCreate && Boolean(stage);
  return <div className={styles.overview}>
    <div className={styles.mainColumn}>
      <section className={styles.card} aria-labelledby="workroom-summary-heading"><h2 id="workroom-summary-heading"><FileText size={20} aria-hidden />Proje özeti</h2><Disclosure text={project.description || "Proje açıklaması belirtilmedi."} id="workroom-description" expanded={expanded} setExpanded={setExpanded} />
        {skills.length > 0 && <div id="workroom-skills" className={styles.skills}>{(skillsExpanded ? skills : skills.slice(0, 5)).map(skill => <span key={skill}>{skill}</span>)}{skills.length > 5 && <button type="button" aria-expanded={skillsExpanded} aria-controls="workroom-skills" onClick={() => setSkillsExpanded(value => !value)}>{skillsExpanded ? "Daha az" : `+${skills.length - 5}`}</button>}</div>}
      </section>
      <section className={styles.card} aria-labelledby="workroom-activity-heading"><h2 id="workroom-activity-heading"><Clock3 size={20} aria-hidden />Son aktiviteler</h2>{loading ? <p className={styles.muted} role="status">Aktiviteler yükleniyor…</p> : error || activityError ? <p className={styles.muted} role="alert">Aktiviteler tam olarak yüklenemedi.</p> : activities.length ? <ol className={styles.activities}>{activities.map(item => <li key={item.id} data-approved={item.approved}><span className={styles.activityDot}>{item.approved && <CheckCircle2 size={17} aria-hidden />}</span><div><h3>{item.title}</h3><p>{item.description}</p></div><time dateTime={item.date}>{projectListDate(item.date)}<span>{new Date(item.date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span></time></li>)}</ol> : <p className={styles.muted}>Henüz kayıtlı aktivite bulunmuyor.</p>}</section>
    </div>
    <aside className={styles.sideColumn} aria-label="Proje durumu ve bilgileri">
      <section className={styles.card} aria-labelledby="workroom-stage-heading"><div className={styles.heading}><h2 id="workroom-stage-heading"><Flag size={20} aria-hidden />Aktif aşama</h2>{!loading && !error && stage && <PanelBadge tone={stage.status === "approved" ? "success" : stage.status === "revision" ? "warning" : "info"}>{STAGE_LABEL[stage.status]}</PanelBadge>}</div>
        {loading ? <p role="status" className={styles.muted}>Aşama yükleniyor…</p> : error ? <p className={styles.muted}>Aşama bilgisi alınamadı.</p> : <><h3 className={styles.stageTitle}>{stage?.title || "Henüz aşama tanımlanmadı"}</h3>{stage?.description && <p className={styles.stageDescription}>{stage.description}</p>}<div className={styles.actionNotice}><Clock3 size={20} aria-hidden /><div><strong>{canDeliver ? "Teslimini göndermen gerekiyor" : canCreate ? "İlk aşamanı oluşturman gerekiyor" : canInspect ? "Aşama durumunu kontrol et" : "Şu an senden işlem beklenmiyor"}</strong><p>{workflow.nextStep}</p>{stage?.due_date && <p>Son tarih: {projectListDate(stage.due_date)}</p>}</div></div>{canDeliver && <Button onClick={() => onMilestone(ownAction ?? null)}>{ownAction?.status === "revision" ? "Revizyonunu hazırla" : "Teslimini hazırla"}</Button>}{canCreate && <Button onClick={() => onMilestone(null)}>İlk aşamanı oluştur</Button>}{canInspect && <Button onClick={() => onMilestone(stage ?? null)}>Aşamanı incele</Button>}</>}
      </section>
      <section className={styles.card} aria-labelledby="workroom-info-heading"><h2 id="workroom-info-heading"><Info size={20} aria-hidden />Proje bilgileri</h2><dl className={styles.projectInfo}>
        <div><dt><CalendarDays size={16} aria-hidden />Oluşturulma tarihi</dt><dd>{projectListDate(project.created_at ?? null)}</dd></div><div><dt><CalendarDays size={16} aria-hidden />Son teslim tarihi</dt><dd>{projectListDate(project.deadline)}</dd></div><div><dt><Layers size={16} aria-hidden />Çalışma modeli</dt><dd>{isTeamProject ? "Ekip projesi" + (project.team_size ? ` · ${project.team_size} kişi` : "") : "Bireysel proje"}</dd></div><div><dt><Coins size={16} aria-hidden />Bütçe</dt><dd>{project.budget === null ? "Belirtilmedi" : formatCurrency(Number(project.budget))}</dd></div>{project.project_type && <div><dt><BriefcaseBusiness size={16} aria-hidden />Proje kategorisi</dt><dd>{project.project_type}</dd></div>}
      </dl></section>
      {project.requirements_note && <ClientNote text={project.requirements_note} />}
    </aside>
  </div>;
}

function Disclosure({ text, id, expanded, setExpanded }: { text: string; id: string; expanded: boolean; setExpanded: (value: boolean) => void }) {
  const long = text.length > 550 || text.split("\n").length > 6;
  return <><p className={`${styles.description} ${!expanded && long ? styles.clamped : ""}`} id={id}>{text}</p>{long && <button type="button" className={styles.textButton} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>{expanded ? "Daha az göster" : "Devamını göster"}</button>}</>;
}

function ClientNote({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return <section className={styles.card + " " + styles.clientNote} aria-labelledby="workroom-note-heading"><h2 id="workroom-note-heading"><MessageCircle size={20} aria-hidden />Client notu</h2><Disclosure text={text} id="workroom-client-note" expanded={expanded} setExpanded={setExpanded} /></section>;
}
