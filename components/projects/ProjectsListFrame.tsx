import type {ReactNode} from "react";
import Image from "next/image";
import {Loader2,AlertCircle,FolderKanban} from "lucide-react";
import {PageHeader} from "@/components/ui/PageHeader";
import {Tabs,type TabItem} from "@/components/ui/Tabs";
import {EmptyState} from "@/components/common/EmptyState";
import {panelRootClass} from "@/components/dashboard/PanelPrimitives";
import {showProjectsMascot} from "./projectListPresentation";
import styles from "./MyProjects.module.css";
export function ProjectsListFrame({title,description,action,tabs,value,onChange,loading,error,totalCount,visibleCount,emptyTitle,emptyDescription,emptyAction,children}:{title:string;description:string;action:ReactNode;tabs:TabItem[];value:string;onChange:(value:string)=>void;loading:boolean;error:string;totalCount:number;visibleCount:number;emptyTitle:string;emptyDescription:string;emptyAction?:ReactNode;children:ReactNode}){const mascot=!loading&&!error&&showProjectsMascot(totalCount,visibleCount);return <main className={[panelRootClass,styles.page].join(" ")}><PageHeader className={styles.header} title={title} description={description} action={action}/>{!error&&<Tabs className="mb-[var(--space-6)]" items={loading?tabs.map(item=>({...item,count:undefined})):tabs} value={value} onChange={onChange}/>}<div className={[styles.layout,mascot?styles.withMascot:""].join(" ")}><div className={styles.list}>{loading?<div role="status" className={styles.loading}><Loader2 size={18} className="animate-spin"/>Projeler yükleniyor…</div>:error?<div className={styles.error} role="alert"><AlertCircle size={18}/><p>{error}</p></div>:visibleCount===0?<EmptyState icon={FolderKanban} title={emptyTitle} description={emptyDescription} action={emptyAction} className={styles.empty}/>:children}</div>{mascot&&<div className={styles.artColumn} aria-hidden="true"><Image src="/images/mascots/projects-laptop.png" width={128} height={128} alt="" sizes="128px" className={styles.mascot}/></div>}</div></main>;}
