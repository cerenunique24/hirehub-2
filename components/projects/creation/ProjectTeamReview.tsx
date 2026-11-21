"use client";
import {useId,useState} from "react";
import Link from "next/link";
import {AlertTriangle,Check,ChevronDown,Sparkles} from "lucide-react";
import type {ProjectAnalysis} from "@/types/ai";
import styles from "./ProjectTeamReview.module.css";
export type ReviewRole={id?:string;name:string;skills:string[];responsibilities:string[];reason?:string};
export type OptionalExpertise={name:string;reason:string};
export function optionalExpertise(value:string):OptionalExpertise|null {
  const match=value.match(/^İsteğe bağlı uzmanlık:\s*(.+?)\s+[—–]\s+(.+)$/iu);
  return match?{name:match[1].trim(),reason:match[2].trim()}:null;
}
export function UnassignedSkillNotice({missing,roles,onAssign}:{missing:string[];roles:ReviewRole[];onAssign?:(skill:string,roleId:string)=>void}) {
  const [open,setOpen]=useState(false),[skill,setSkill]=useState(""),[roleId,setRoleId]=useState("");
  const id=useId(),selected=missing.includes(skill)?skill:missing[0];
  if(!missing.length)return null;
  return <aside className={styles.warning} aria-label="Atanmayan beceriler"><AlertTriangle size={18} aria-hidden="true"/><div className={styles.warningCopy}><h4>{missing.length} beceri role atanmadı</h4><p>{missing.join(" · ")}</p></div>{onAssign&&roles.length>0&&<button type="button" className={styles.action} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>Bir role ata</button>}
    {open&&onAssign&&<form id={id} className={styles.assignment} onSubmit={event=>{event.preventDefault();if(selected&&roles.some(role=>(role.id??role.name)===roleId)){onAssign(selected,roleId);setOpen(false);setRoleId("");}}}>
      <label>Beceri<select value={selected} onChange={event=>setSkill(event.target.value)}>{missing.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <label>Atanacak rol<select required value={roleId} onChange={event=>setRoleId(event.target.value)}><option value="">Rol seçin</option>{roles.map(role=><option key={role.id??role.name} value={role.id??role.name}>{role.name||"İsimsiz rol"}</option>)}</select></label>
      <button type="submit" className={styles.primary} disabled={!roleId}>Beceriyi role ekle</button>
    </form>}
  </aside>;
}
function OptionalRole({suggestion,roles,onAdd}:{suggestion:OptionalExpertise;roles:ReviewRole[];onAdd?:(suggestion:OptionalExpertise)=>void}) {
 const [open,setOpen]=useState(false),[name,setName]=useState(suggestion.name),id=useId();
 const exists=roles.some(role=>role.name.trim().toLocaleLowerCase("tr-TR")===name.trim().toLocaleLowerCase("tr-TR"));
 return <div className={styles.optional}><div><h5>{suggestion.name}</h5><p>{suggestion.reason}</p></div>{onAdd&&<button type="button" className={styles.action} onClick={()=>setOpen(value=>!value)} aria-expanded={open}>{exists?"Rol ekipte mevcut":"+ Rol olarak ekle"}</button>}{open&&onAdd&&<div className={styles.confirm}><label htmlFor={id}>Eklenecek rol</label><input id={id} value={name} onChange={event=>setName(event.target.value)}/><p>Rolü ekledikten sonra becerilerini ve sorumluluklarını düzenleyebilirsiniz.</p><button type="button" className={styles.primary} disabled={!name.trim()||exists} onClick={()=>{onAdd({name:name.trim(),reason:suggestion.reason});setOpen(false);}}>Rolü ekle</button><button type="button" className={styles.action} onClick={()=>setOpen(false)}>Vazgeç</button></div>}</div>;
}
export function ProjectTeamReview({analysis,roles,coverage,plus,pro,risk,attention,suggestions,onAssign,onAdd,accessLoading=false}:{analysis:ProjectAnalysis;accessLoading?:boolean;roles:ReviewRole[];coverage:{covered:number;required:string[];missing:string[]};plus:boolean;pro:boolean;risk?:string;attention:string[];suggestions:string[];onAssign?:(skill:string,roleId:string)=>void;onAdd?:(suggestion:OptionalExpertise)=>void}) {
 if(accessLoading)return <p role="status" className={styles.teaser}>Analiz erişimi kontrol ediliyor…</p>;
 if(!plus)return <div className={styles.teaser}><Sparkles size={16}/><div><h3>Colla AI Proje Analizi <span>Plus</span></h3><p>Ekibinizin kapsamını, dikkat noktalarını ve geliştirme fırsatlarını inceleyin.</p></div><Link href="/premium">Planları incele →</Link></div>;
 const optional=suggestions.map(optionalExpertise).filter((value):value is OptionalExpertise=>value!==null);
 const recommendations=suggestions.filter(value=>!optionalExpertise(value));
 const complete=coverage.required.length>0&&coverage.missing.length===0&&roles.length>0;
 const complexity=({Low:"Düşük",Medium:"Orta",High:"Yüksek"} as Record<string,string>)[analysis.complexity];
 return <details className={styles.review}><summary><Sparkles size={18}/><span><strong>Colla AI Proje Analizi <span className={styles.plan}>{pro?"Pro":"Plus"}</span></strong><small>Ekibinizin kapsamını, dikkat noktalarını ve geliştirme fırsatlarını inceleyin.</small></span><span className={styles.view}>Analizi görüntüle<ChevronDown size={16}/></span></summary>
 <div className={styles.body}><div className={styles.verdict}>{complete?<Check size={18}/>:<AlertTriangle size={18}/>}<div><h4>{complete?"Tanımlı temel beceriler karşılanıyor":coverage.missing.length?"Beceri dağılımını tamamlayın":"Rol kapsamını gözden geçirin"}</h4><p>{complete?`${roles.length} çekirdek rol, analizde belirlenen temel becerileri kapsıyor.`:coverage.missing.length?"Analizde belirlenen bazı beceriler henüz bir role atanmamış.":"Kapsam yeterliliği hakkında kesin bir sonuç için yeterli beceri verisi bulunmuyor."}</p></div></div>
 <dl className={styles.metrics}><div><dt>Ekip yapısı</dt><dd>{roles.length} çekirdek rol</dd></div><div><dt>Beceri kapsamı</dt><dd>{coverage.covered} / {coverage.required.length}</dd></div>{complexity&&<div><dt>Kapsam</dt><dd>{complexity}</dd></div>}</dl>
 {coverage.missing.length>0&&<UnassignedSkillNotice missing={coverage.missing} roles={roles} onAssign={onAssign}/>}
 {risk&&<div className={styles.risk}><h4>Dikkat gerektiren nokta</h4><p>{risk}</p></div>}
 <section className={styles.section}><h4>Ekip değerlendirmesi</h4>{roles.map(role=>{const original=analysis.roleDetails?.find(detail=>detail.role.trim().toLocaleLowerCase("tr-TR")===role.name.trim().toLocaleLowerCase("tr-TR"));const reason=role.reason||original?.reason;return <div className={styles.role} key={role.id??role.name}><div><h5>{role.name}</h5><p>{role.skills.length>0&&role.responsibilities.length>0?"İş kapsamı ve temel beceriler tanımlı.":"Rol kapsamını ve temel becerilerini tamamlayın."}</p></div>{reason&&<details><summary>Detayı gör</summary><p>{reason}</p></details>}</div>;})}</section>
 {optional.length>0&&<section className={styles.section}><h4>İsteğe bağlı uzmanlıklar</h4>{optional.map(suggestion=><OptionalRole key={suggestion.name} suggestion={suggestion} roles={roles} onAdd={onAdd}/>)}</section>}
 {(attention.length>0||recommendations.length>0)&&<section className={styles.section}><h4>Gözden geçirilecek noktalar</h4><ul>{[...new Set([...attention,...recommendations])].filter(value=>value!==risk).map(value=><li key={value}>{value}</li>)}</ul></section>}
 </div></details>;
}
