"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, Coins, FileText, Info, Layers, Users } from "lucide-react";
import { PanelBadge } from "@/components/dashboard/PanelPrimitives";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { Milestone, MilestoneEvent } from "@/lib/projects/milestones";
import type { ProjectWorkflowState } from "@/lib/projects/workflow-state";
import type { RoleCompletion } from "@/lib/projects/teamReadiness";
import type { DetailProject } from "./ProjectDetailSurface";
import type { WorkroomProject } from "./ProjectWorkroom";
import { projectActivities } from "./FreelancerProjectOverview";
import { projectListDate, projectListStatus } from "./projectListPresentation";
import { projectDescriptionBlocks } from "../client/projectInformationPresentation";
import shared from "./FreelancerProjectOverview.module.css";
import styles from "./ClientProjectOverview.module.css";

export function ClientProjectHeader({project, memberCount, actions}: {project: DetailProject; memberCount: number; actions?: ReactNode}) {
  const status = projectListStatus(project.status);
  return <header className={`${shared.header} ${styles.header}`}><div className={styles.headerTop}><div><PanelBadge tone={status.tone}>{status.label}</PanelBadge><h1>{project.title}</h1></div><div className={styles.actions}>{actions}</div></div><dl className={`${shared.headerMetadata} ${styles.metadata}`}>
    <div><dt><Users size={20} aria-hidden/>Ekip</dt><dd>{memberCount} freelancer</dd></div>
    <div><dt><Coins size={20} aria-hidden/>Proje bütçesi</dt><dd>{project.budget == null ? "Belirtilmedi" : formatCurrency(Number(project.budget))}</dd></div>
    <div><dt><CalendarDays size={20} aria-hidden/>Son tarih</dt><dd>{projectListDate(project.deadline)}</dd></div>
    <div><dt><CalendarDays size={20} aria-hidden/>Oluşturuldu</dt><dd>{projectListDate(project.created_at ?? null)}</dd></div>
    <div><dt><BriefcaseBusiness size={20} aria-hidden/>Çalışma modeli</dt><dd>{project.team_required ? "Ekip projesi" : "Bireysel proje"}</dd></div>
  </dl></header>;
}

export function ClientStatusBand({project, milestones, events, workflow, loading, error, memberCount, proposalCount, children}: {project: WorkroomProject; milestones: Milestone[]; events: MilestoneEvent[]; workflow: ProjectWorkflowState; loading: boolean; error: string; memberCount: number; proposalCount: number; children: ReactNode}) {
  const started = ["in_progress", "completed", "paused"].includes(project.status ?? "");
  const stage = started ? 4 : project.status === "ready_to_start" ? 3 : project.status === "open" ? memberCount > 0 ? 3 : proposalCount > 0 ? 2 : 1 : null;
  const approved = milestones.filter(item=>item.status === "approved").length;
  const latest = projectActivities(project, events, milestones)[0];
  return <section className={`${shared.statusBand} ${styles.status}`} aria-label="Şu anki durum" aria-live="polite">
    <Image src="/images/mascots/projects-laptop.png" width={64} height={64} alt="" className={shared.mascot}/><div className={shared.statusCopy}><p className={shared.eyebrow}>Şu anki durum</p><h2>{loading ? "Durum yükleniyor" : error ? "Durum doğrulanamadı" : workflow.state}</h2><p>{loading ? "Proje aşamaları kontrol ediliyor." : error ? "Aşama bilgileri alınamadı." : workflow.nextStep}</p>{!loading && !error && latest && <p className={styles.lastActivity}><Clock3 size={14} aria-hidden/>Son hareket: {latest.title} · {projectListDate(latest.date)}</p>}</div>
    {!loading && !error && stage !== null && <div className={`${shared.progress} ${styles.progress}`}><strong>{started ? `Onaylanan aşamalar ${approved} / ${milestones.length}` : `Aşama ${stage} / 4`}</strong>{started ? milestones.length > 0 && <progress value={approved} max={milestones.length} aria-label="Onaylanan proje aşamaları"/> : <><progress value={stage} max={4} aria-label="Proje hazırlığı"/><ol className={styles.steps}>{["Yayınlandı", "Teklifler", "Ekip kurulumu", "Proje başladı"].map((label,index)=><li key={label} data-current={stage === index+1} aria-current={stage === index+1 ? "step" : undefined}>{label}</li>)}</ol></>}</div>}
    <div className={styles.statusActions}>{children}</div>
  </section>;
}

export default function ClientProjectOverview({project, milestones, events, openRoles, loading, error, activityError, isTeamProject}: {project: WorkroomProject; milestones: Milestone[]; events: MilestoneEvent[]; openRoles: RoleCompletion[]; loading: boolean; error: string; activityError: boolean; isTeamProject: boolean}) {
  const [expanded,setExpanded] = useState(false), [skillsExpanded,setSkillsExpanded] = useState(false);
  const skills = project.skills ?? [], activities = projectActivities(project,events,milestones);
  const blocks = projectDescriptionBlocks(project.description ?? "");
  const paragraphs = blocks.filter(block=>block.type !== "list").flatMap(block=>block.lines).join("\n");
  const requirements = blocks.filter(block=>block.type === "list").flatMap(block=>block.lines);
  const canRecruit = project.status === "open";
  return <div className={`${shared.overview} ${styles.overview}`}><div className={shared.mainColumn}>
    <section className={shared.card} aria-labelledby="client-summary"><h2 id="client-summary"><FileText size={20} aria-hidden/>Proje özeti</h2><div id="client-description" className={expanded ? styles.description : `${styles.description} ${styles.clamped}`}><p>{paragraphs || (!requirements.length ? "Proje açıklaması belirtilmedi." : "")}</p>{requirements.length > 0 && <><h3>Projede istediğimiz özellikler</h3><ul className={styles.requirements}>{requirements.map((line,index)=><li key={index}>{line}</li>)}</ul></>}</div>{(project.description?.length ?? 0) > 0 && <button className={shared.textButton} type="button" aria-expanded={expanded} aria-controls="client-description" onClick={()=>setExpanded(!expanded)}>{expanded ? "Daha az göster" : "Devamını göster"}</button>}
      {skills.length > 0 && <><h3 className={styles.skillsTitle}>Gerekli yetenekler</h3><div id="client-skills" className={shared.skills}>{(skillsExpanded ? skills : skills.slice(0,5)).map((skill,index)=><span key={index}>{skill}</span>)}{skills.length > 5 && <button type="button" aria-expanded={skillsExpanded} aria-controls="client-skills" onClick={()=>setSkillsExpanded(!skillsExpanded)}>{skillsExpanded ? "Daha az" : `+${skills.length-5}`}</button>}</div></>}
    </section>
    <section className={shared.card} aria-labelledby="client-activity"><h2 id="client-activity"><Clock3 size={20} aria-hidden/>Son aktiviteler</h2>{loading ? <p className={shared.muted} role="status">Aktiviteler yükleniyor…</p> : error || activityError ? <p className={shared.muted}>Aktiviteler tam olarak yüklenemedi.</p> : <ol className={shared.activities}>{activities.map(item=><li key={item.id}><span className={shared.activityDot}/><div><h3>{item.title}</h3><p>{item.description}</p></div><time dateTime={item.date}>{projectListDate(item.date)}<span>{new Date(item.date).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</span></time></li>)}</ol>}</section>
  </div><aside className={shared.sideColumn} aria-label="Proje yönetim bilgileri">
    <section className={shared.card} aria-labelledby="client-roles"><h2 id="client-roles"><Users size={20} aria-hidden/>Açık roller ({openRoles.length})</h2><div className={styles.roles}>{openRoles.map((role,index)=><div key={index} className={styles.role}><span className={styles.roleIcon}><BriefcaseBusiness size={20} aria-hidden/></span><div><h3>{role.role}</h3><p>{role.capacity-role.filled} açık pozisyon</p></div>{canRecruit && <Link href="/client/freelancers" aria-label={`${role.role} için freelancer bul`}>Freelancer bul <ArrowRight size={15} aria-hidden/></Link>}</div>)}</div>{!openRoles.length && <p className={shared.muted}>{canRecruit ? "Tanımlı açık rol bulunmuyor." : "Proje yeni ekip katılımına açık değil."}</p>}{canRecruit && !openRoles.length && <Link href="/client/freelancers" className={shared.textButton}>Freelancer keşfet →</Link>}</section>
    <section className={shared.card} aria-labelledby="client-info"><h2 id="client-info"><Info size={20} aria-hidden/>Proje bilgileri</h2><dl className={shared.projectInfo}>
      <div><dt><CalendarDays size={16} aria-hidden/>Oluşturulma tarihi</dt><dd>{projectListDate(project.created_at ?? null)}</dd></div><div><dt><CalendarDays size={16} aria-hidden/>Son teslim tarihi</dt><dd>{projectListDate(project.deadline)}</dd></div><div><dt><Layers size={16} aria-hidden/>Çalışma modeli</dt><dd>{isTeamProject ? "Ekip projesi" : "Bireysel proje"}</dd></div><div><dt><Coins size={16} aria-hidden/>Bütçe</dt><dd>{project.budget == null ? "Belirtilmedi" : formatCurrency(Number(project.budget))}</dd></div>{project.project_type && <div><dt><BriefcaseBusiness size={16} aria-hidden/>Proje kategorisi</dt><dd>{project.project_type}</dd></div>}
    </dl></section>{project.requirements_note && <section className={shared.card}><h2><FileText size={20} aria-hidden/>Yayın notu</h2><p className={styles.description}>{project.requirements_note}</p></section>}
  </aside></div>;
}
