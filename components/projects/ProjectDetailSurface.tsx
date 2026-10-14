import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PanelBadge, PanelAction } from "@/components/dashboard/PanelPrimitives";
import { ProjectInformation } from "@/components/client/ProjectInformation";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { projectListStatus, projectListDate } from "./projectListPresentation";
import workroomStyles from "./ProjectWorkroom.module.css";
import styles from "./ProjectDetailSurface.module.css";

type Role = "client" | "freelancer";
export type DetailProject = {title:string;status:string|null;description:string|null;budget:number|null;deadline:string|null;skills?:string[]|null;project_type?:string|null;created_at?:string|null;team_required?:boolean|null;team_size?:number|null};
function Navigation({backHref,messageHref}:{backHref:string;messageHref?:string}) {
  return <nav className={styles.navigation} aria-label="Proje gezinmesi"><Link href={backHref} className={styles.back}><ArrowLeft size={16}/>Projelere dön</Link>{messageHref&&<PanelAction href={messageHref}><ArrowLeft size={16}/>Mesajlara dön</PanelAction>}</nav>;
}
export function ProjectDetailState({backHref,loading,error}:{backHref:string;loading?:boolean;error?:string}) {
  return <main className={styles.page}><Navigation backHref={backHref}/>{loading?<div className={styles.loading} role="status"><Loader2 size={18} className="animate-spin"/>Proje yükleniyor…</div>:<section className={styles.error} role="alert"><h1>Proje görüntülenemedi</h1><p>{error || "Aradığınız proje bulunamadı."}</p></section>}</main>;
}
export function ProjectDetailSurface({role,project,backHref,messageHref,memberCount,personalRole,coalitionId,actions,children}:{role:Role;project:DetailProject;backHref:string;messageHref?:string;memberCount:number;personalRole?:string|null;coalitionId:string|null;actions?:ReactNode;children:ReactNode}) {
  const status=projectListStatus(project.status);
  return <main className={styles.page}><Navigation backHref={backHref} messageHref={messageHref}/><div className={styles.content}>
    <header className={styles.header}>
      <div className={styles.identity}><PanelBadge tone={status.tone}>{status.label}</PanelBadge><h1>{project.title}</h1></div>
      <ProjectInformation description={project.description ?? ""} skills={project.skills ?? null}/>
      <dl className={workroomStyles.metadata}>
        {role==="freelancer"&&<div><dt>Projede rolün</dt><dd>{personalRole || "Rol bilgisi bulunmuyor"}</dd></div>}
        <div><dt>Ekip</dt><dd>{memberCount} freelancer{project.team_required===true?" · Ekip projesi":""}</dd></div>
        <div><dt>Proje bütçesi</dt><dd>{project.budget!==null&&Number.isFinite(Number(project.budget))?formatCurrency(Number(project.budget)):"Belirtilmedi"}</dd></div>
        <div><dt>Son tarih</dt><dd>{projectListDate(project.deadline)}</dd></div>
        {project.project_type&&<div><dt>Proje tipi</dt><dd>{project.project_type}</dd></div>}
        {project.created_at&&<div><dt>Oluşturuldu</dt><dd>{projectListDate(project.created_at)}</dd></div>}
        {typeof project.team_required==="boolean"&&<div><dt>Çalışma modeli</dt><dd>{project.team_required?"Ekip projesi":"Bireysel proje"}{project.team_required&&project.team_size?" · "+project.team_size+" kişi":""}</dd></div>}
      </dl>
      {(actions||coalitionId)&&<div className={styles.actions}>{actions}{coalitionId&&<PanelAction href={(role==="client"?"/client/coalitions/":"/freelancers/coalitions/")+coalitionId}>Ekip Alanını Aç</PanelAction>}</div>}
    </header>
    {children}
  </div></main>;
}
