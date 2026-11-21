"use client";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import Link from "next/link";
import {coalitionProjectLabel} from "@/components/coalitions/coalitionPresentation";
import styles from "./Dashboard.module.css";
type Context={id:string;title:string;status:string|null;members:unknown[];roles:string[]};
type Coalition={id:string;name:string;project_id:string;status:string};
export function ClientCoalitionPreview({projects}:{projects:Context[]}) {
 const supabase=useMemo(()=>createClient(),[]),[rows,setRows]=useState<Coalition[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 const ids=projects.map(project=>project.id).sort().join(",");
 useEffect(()=>{let active=true;async function load(){if(!ids){if(active)setLoading(false);return;}const {data:auth}=await supabase.auth.getUser();if(!auth.user)throw Error("Session unavailable");const result=await supabase.from("coalitions").select("id,name,project_id,status").eq("created_by",auth.user.id).eq("status","active").in("project_id",ids.split(",")).order("created_at",{ascending:false}).limit(2);if(result.error)throw result.error;if(active){setRows((result.data??[]) as Coalition[]);setError(false);}}void load().catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[ids,supabase]);
 const visibleRows=rows.filter(row=>projects.some(project=>project.id===row.project_id));
 return <details className={styles.coalitions}><summary>Koalisyonlar</summary>{loading?<p role="status" className={styles.quiet}>Koalisyonlar yükleniyor…</p>:error?<p className={styles.quiet}>Koalisyon bilgileri görüntülenemedi. Koalisyonlar sayfasından tekrar kontrol edebilirsiniz.</p>:visibleRows.length?visibleRows.map(row=>{const project=projects.find(project=>project.id===row.project_id);return <article key={row.id} className={styles.coalitionRow}><h3>{row.name}</h3>{project?.status&&<p>{coalitionProjectLabel(project.status)}</p>}<p>{project?`${project.members.length} ekip üyesi · ${project.roles.length} rol`:"Proje bilgisi doğrulanamadı"}</p><Link href={"/client/coalitions/"+row.id}>Ekip alanını aç →</Link></article>;}):<p className={styles.quiet}>Aktif koalisyon bulunmuyor.</p>}<Link href="/client/coalitions">Tüm koalisyonları gör →</Link></details>;
}
