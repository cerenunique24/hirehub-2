import Link from "next/link";
import Image from "next/image";
import type { ReactNode, Ref } from "react";
import { ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import { panelRootClass, PanelBadge, PanelAction, PanelSection, type PanelTone } from "@/components/dashboard/PanelPrimitives";
import type { TeamCompletion } from "@/lib/projects/teamReadiness";
import { coalitionProjectLabel, coalitionStageLabel, type CoalitionStage } from "./coalitionPresentation";
import TeamMessagesPanel from "./TeamMessagesPanel";
import styles from "./Coalitions.module.css";

export type WorkspaceMember = {id:string; userId:string; name:string; avatarUrl:string|null; projectRole:string|null; owner:boolean; self:boolean; actions?:ReactNode};
function MemberAvatar({member}:{member:Pick<WorkspaceMember,"name"|"avatarUrl">}) {
  return member.avatarUrl ? <Image unoptimized src={member.avatarUrl} width={32} height={32} alt="" className={styles.avatar}/> : <span className={styles.avatar}>{member.name.charAt(0)}</span>;
}
export function WorkspaceMemberRow({member,status="Aktif",detail}:{member:WorkspaceMember;status?:string;detail?:ReactNode}) {
  return <div className={member.self?styles.selfRow:styles.memberRow}>
    <div className={styles.memberIdentity}><MemberAvatar member={member}/><div>
      <div className={styles.statusLine}><strong>{member.name}</strong>{member.self&&<PanelBadge tone="info">Sen</PanelBadge>}</div>
      <p>{member.projectRole || "Proje rolü belirtilmedi"}</p>
      {member.owner&&<span className={styles.metaLabel}>Koalisyon yöneticisi</span>}{detail}
    </div></div>
    <div className={styles.actions}><PanelBadge>{status}</PanelBadge>{member.actions}</div>
  </div>;
}
export function CoalitionWorkspaceState({backHref,loading,error}:{backHref:string;loading?:boolean;error?:string}) {
  return <main className={[panelRootClass,styles.page].join(" ")}><Link href={backHref} className={styles.back}><ArrowLeft size={16}/>Koalisyonlarım</Link>
    {loading?<div role="status" className={styles.workspaceLoading}><Loader2 size={24} className="animate-spin"/><p>Ekip Alanı yükleniyor…</p></div>:<div role="alert" className={styles.error}><h1>Ekip Alanı yüklenemedi</h1><p>{error || "Koalisyon bulunamadı veya görüntüleme izniniz yok."}</p></div>}
  </main>;
}
export function CoalitionWorkspace({overviewRef,backHref,name,coalitionStatus,project,headerContext,error,members,team,roleCapacityKnown,status,stages,stagesHref,events,formatDate,coalitionId,currentUserId,description,skills=[],management}:{
  overviewRef?:Ref<HTMLElement>;backHref:string;name:string;coalitionStatus:string;
  project:{title:string;status:string}|null;headerContext?:ReactNode;error?:string;
  members:WorkspaceMember[];team:TeamCompletion|null;roleCapacityKnown:boolean;
  status:{headline:string;state:string;tone:PanelTone;nextStep:string;mustAct:boolean;facts:{label:string;value:ReactNode}[];action?:ReactNode};
  stages:CoalitionStage[]|null;stagesHref:string;events:{id:string;date:string;text:string}[];formatDate:(value:string)=>string;
  coalitionId:string;currentUserId:string|null;description:string|null;skills?:string[];management?:ReactNode;
}) {
  const approved=stages?.filter(stage=>stage.status==="approved").length??0;
  return <main ref={overviewRef} className={[panelRootClass,styles.page].join(" ")}>
    <Link href={backHref} className={styles.back}><ArrowLeft size={16}/>Koalisyonlarım</Link>
    {error&&<div role="alert" className={styles.error}>{error}</div>}
    <header className={styles.detailHeader}>
      <div className={styles.workspaceHeading}><span className={styles.eyebrow}>Ekip Alanı</span>
        <div className={styles.cardHeading}><h1>{name}</h1><div className={styles.labeledBadge}><span>Koalisyon</span><PanelBadge>{coalitionStatus==="active"?"Aktif":coalitionStatus==="completed"?"Tamamlandı":"Durum bilinmiyor"}</PanelBadge></div></div>
        <p className={styles.projectName}>{project?.title || "Proje bağlantısı veya bilgileri bulunmuyor"}</p>
        <div className={styles.avatarGroup}>{members.slice(0,4).map(member=><span key={member.id} title={member.name}><MemberAvatar member={member}/></span>)}<span>{members.length} ekip üyesi</span></div>
        {headerContext&&<p className={styles.secondary}>{headerContext}</p>}
        {project&&<div className={styles.statusLine}><span>Proje</span><PanelBadge>{coalitionProjectLabel(project.status)}</PanelBadge></div>}
      </div>
      <div className={styles.actions}>{currentUserId&&<PanelAction href="#team-messages"><MessageSquare size={16}/>Mesajlar</PanelAction>}{project&&<PanelAction href={stagesHref.split("?")[0]}>Bağlı projeyi gör</PanelAction>}</div>
    </header>
    <section className={styles.coordinationSummary} data-action-required={status.mustAct} aria-labelledby="workflow-heading">
      <div className={styles.workflowTop}><div><p className={styles.eyebrow}>Şu anki durum</p><h2 id="workflow-heading">{status.headline}</h2></div><PanelBadge tone={status.tone}>{status.state}</PanelBadge></div>
      <p className={styles.nextStep}>{status.nextStep}</p>{status.mustAct&&<PanelBadge tone="info">Senden aksiyon bekleniyor</PanelBadge>}
      <dl className={styles.coordinationFacts}>{status.facts.map(fact=><div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>{status.action}
    </section>
    <PanelSection title="Ekip ve rol dağılımı" className={styles.section}><div className={styles.sectionBody}>
      <div className={styles.statusLine}><span>{members.length} aktif koalisyon üyesi</span>{team&&roleCapacityKnown?<PanelBadge tone="warning">{team.ready?"Tüm roller dolu":team.filledRoles+" / "+team.totalRoles+" rol dolu"}</PanelBadge>:<span>Rol kontenjanı bilgisi bulunmuyor</span>}</div>
      {members.length?members.map(member=><WorkspaceMemberRow key={member.id} member={member}/>):<p className={styles.secondary}>Henüz aktif ekip üyesi yok.</p>}
      {team&&roleCapacityKnown&&<div className={styles.roleCapacity}><h3>Rol kontenjanları</h3>{team.roles.map(role=><div key={role.role} className={styles.roleRow}><span>{role.role}</span><span>{role.filled} / {role.capacity} kişi</span></div>)}</div>}
    </div></PanelSection>
    <PanelSection title="Ekip hakkında" className={styles.section}><div className={styles.sectionBody}><p className={styles.secondary}>{description || "Açıklama eklenmemiş."}</p>{skills.length>0&&<div className={styles.actions}>{skills.map(skill=><span key={skill} className="rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-sm">{skill}</span>)}</div>}</div></PanelSection>
    <PanelSection title="Proje ilerlemesi" className={styles.section}><div className={styles.sectionBody}>
      {stages===null?<p className={styles.secondary}>Aşama bilgileri alınamadı. Çalışma alanını kontrol edebilirsin.</p>:!stages.length?<p className={styles.secondary}>Henüz proje aşaması tanımlanmadı.</p>:<>
        <div className={styles.progressLabel}><span>{approved} / {stages.length} aşama onaylandı</span><span>{Math.round(approved/stages.length*100)}%</span></div><progress className={styles.progress} max={stages.length} value={approved} aria-label="Onaylanan ekip aşamaları"/>
        {stages.slice(0,3).map(stage=><div key={stage.id} className={styles.stageRow}><div><strong>{stage.title}</strong><p className={styles.secondary}>{stage.freelancer_id?members.find(member=>member.userId===stage.freelancer_id)?.name || "Sorumlu üye bilgisi görünmüyor":"Sorumlu atanmadı"}{stage.due_date&&" · "+formatDate(stage.due_date)}</p></div><PanelBadge>{coalitionStageLabel(stage.status)}</PanelBadge></div>)}
      </>}{project&&<Link href={stagesHref} className={styles.projectLink}>Tüm aşamaları projede gör{stages&&stages.length>3?" · "+stages.length+" aşama":""}</Link>}
    </div></PanelSection>
    <PanelSection title="Son hareketler" className={styles.section}>{events.length===0&&<p className={styles.sectionBody}>Henüz görünür bir hareket yok.</p>}<ol className={styles.activity}>{events.map(event=><li key={event.id}><p>{event.text}</p><time dateTime={event.date}>{formatDate(event.date)}</time></li>)}</ol>{stages===null&&<p className={styles.sectionBody}>Teslim ve revizyon hareketleri alınamadı.</p>}</PanelSection>
    {currentUserId&&<PanelSection title="Ekip iletişimi" className={styles.section}><div id="team-messages" className={styles.sectionBody}><p className={styles.secondary}>Rol paylaşımı ve proje koordinasyonunu ekibinle burada konuş.</p><div className={styles.messageBody}><TeamMessagesPanel coalitionId={coalitionId} currentUserId={currentUserId} memberLabels={members.map(member=>({id:member.userId,name:member.name}))}/></div></div></PanelSection>}
    {management&&<PanelSection title="Koalisyon yönetimi" className={styles.section}><div className={styles.sectionBody}>{management}</div></PanelSection>}
  </main>;
}
