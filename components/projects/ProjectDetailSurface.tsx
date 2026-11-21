import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PanelAction } from "@/components/dashboard/PanelPrimitives";
import { ClientProjectHeader } from "./ClientProjectOverview";
import styles from "./ProjectDetailSurface.module.css";

type Role = "client" | "freelancer";
export type DetailProject = {title:string;status:string|null;description:string|null;budget:number|null;deadline:string|null;skills?:string[]|null;project_type?:string|null;created_at?:string|null;team_required?:boolean|null;team_size?:number|null};
function Navigation({backHref,messageHref}:{backHref:string;messageHref?:string}) {
  return <nav className={styles.navigation} aria-label="Proje gezinmesi"><Link href={backHref} className={styles.back}><ArrowLeft size={16}/>Projelere dön</Link>{messageHref&&<PanelAction href={messageHref}><ArrowLeft size={16}/>Mesajlara dön</PanelAction>}</nav>;
}
export function ProjectDetailState({backHref,loading,error}:{backHref:string;loading?:boolean;error?:string}) {
  return <main className={styles.page}><Navigation backHref={backHref}/>{loading?<div className={styles.loading} role="status"><Loader2 size={18} className="animate-spin"/>Proje yükleniyor…</div>:<section className={styles.error} role="alert"><h1>Proje görüntülenemedi</h1><p>{error || "Aradığınız proje bulunamadı."}</p></section>}</main>;
}
export function ProjectDetailSurface({role,project,backHref,messageHref,memberCount,actions,children}:{role:Role;project:DetailProject;backHref:string;messageHref?:string;memberCount:number;personalRole?:string|null;coalitionId:string|null;actions?:ReactNode;children:ReactNode;proposalCount?:number}) {
  if (role === "freelancer") return <main className={styles.page}><nav className={styles.navigation} aria-label="Proje gezinmesi"><Link href={backHref} className={styles.back}><ArrowLeft size={16} aria-hidden />Projelerime dön</Link>{messageHref && <PanelAction href={messageHref}><ArrowLeft size={16} aria-hidden />Mesajlara dön</PanelAction>}</nav><div className={styles.content}>{children}</div></main>;
  return <main className={`${styles.page} ${role === "client" ? styles.clientPage : ""}`}><Navigation backHref={backHref} messageHref={messageHref}/><div className={styles.content}>
    <ClientProjectHeader project={project} memberCount={memberCount} actions={actions}/>
    {children}
  </div></main>;
}
