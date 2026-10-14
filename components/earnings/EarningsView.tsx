"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {Button} from "@/components/ui/Button";
import {panelRootClass} from "@/components/dashboard/PanelPrimitives";
import {formatCurrency} from "@/lib/utils/formatCurrency";
import {PLATFORM_FEE_MODEL} from "@/lib/pricing";
import type {FreelancerEarningsSummary,FreelancerEarningMovement} from "@/lib/financials";
import {earningsPaymentPresentation,earningWorkLabel} from "@/lib/payments/earningsPresentation";
import styles from "./Earnings.module.css";

type Filter="all"|"approved"|"pending"|"problem";
function dateLabel(value:string|null){return value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleDateString("tr-TR",{day:"numeric",month:"short",year:"numeric"}):"Tarih belirtilmemiş";}
function amount(value:number|null|undefined){return value===null||value===undefined?"Belirtilmemiş":formatCurrency(value);}
function movementHref(row:FreelancerEarningMovement){return row.projectStatus==="completed"?`/freelancers/earnings/${row.projectId}`:row.projectStatus==="in_progress"?`/freelancers/projects/${row.projectId}`:`/freelancers/discover/${row.projectId}`;}
function MovementTable({rows}:{rows:FreelancerEarningMovement[]}){
 return <table className={styles.table}><caption className="sr-only">Proje aşamalarına ait kazanç ve ödeme durumu kayıtları</caption><thead><tr><th scope="col">İşlem / Proje</th><th scope="col">Tarih</th><th scope="col">Ödeme durumu</th><th scope="col">Brüt</th><th scope="col">Net hakediş</th></tr></thead><tbody>{rows.map(row=>{
  const payment=earningsPaymentPresentation(row.paymentStatus);
  return <tr key={row.id}><td className={styles.movementTitle}><Link href={movementHref(row)}>{row.title}</Link><p>{row.projectTitle}</p><span>{earningWorkLabel(row.status)}</span><details className={styles.details}><summary>Tutar detayları</summary><dl><div><dt>Brüt hakediş</dt><dd>{amount(row.gross)}</dd></div><div><dt>Freelancer kesintisi</dt><dd>{amount(row.freelancerDeduction)}</dd></div><div><dt>Net hakediş</dt><dd>{amount(row.net)}</dd></div>{row.clientPlatformFee!==null&&<div><dt>Client hizmet bedeli</dt><dd>{amount(row.clientPlatformFee)} · client tarafından ödenir</dd></div>}{row.paymentReference&&<div><dt>Ödeme referansı</dt><dd>{row.paymentReference}</dd></div>}{row.provider&&<div><dt>Sağlayıcı kaydı</dt><dd>{row.provider}</dd></div>}</dl></details></td><td data-label="Tarih"><time dateTime={row.approvedAt??row.createdAt}>{dateLabel(row.approvedAt??row.createdAt)}</time>{row.approvedAt&&<small>Onay tarihi</small>}</td><td data-label="Ödeme durumu"><span className={styles.status} data-tone={payment.tone}>{payment.label}</span></td><td data-label="Brüt" className={styles.money}>{amount(row.gross)}</td><td data-label="Net hakediş" className={styles.money}>{amount(row.net)}</td></tr>;
 })}</tbody></table>;
}
export function EarningsView({summary,loading,error,onRetry}:{summary:FreelancerEarningsSummary|null;loading:boolean;error:string;onRetry:()=>void}){
 const [filter,setFilter]=useState<Filter>("all"),[visibleCount,setVisibleCount]=useState(10);
 const movements=summary?.movements;
 const filtered=useMemo(()=>(movements??[]).filter(row=>filter==="all"||filter==="approved"&&row.status==="approved"||filter==="pending"&&["pending","payment_initiated"].includes(row.paymentStatus??"pending")||filter==="problem"&&earningsPaymentPresentation(row.paymentStatus).tone==="danger"),[movements,filter]);
 const empty=Boolean(summary&&summary.projects.length===0&&(movements?.length??0)===0);
 const hasProblem=(movements??[]).some(row=>earningsPaymentPresentation(row.paymentStatus).tone==="danger");
 return <main className={[panelRootClass,styles.page].join(" ")}>
  <header className={styles.header}><div><h1>Kazançlarım</h1><p>Hakedişlerini, aşama onaylarını ve ödeme durumlarını takip et.</p></div><Button disabled aria-describedby="withdrawal-unavailable">Para Çek</Button></header>
  <div id="withdrawal-unavailable" className={styles.notice}><strong>Hakediş, çekilebilir bakiye değildir.</strong><p>Ödeme ve para aktarımı altyapısı henüz aktif değil. Buradaki tutarlar proje ve aşama kayıtlarını gösterir; banka hesabına ödeme yapıldığını göstermez.</p></div>
  {loading?<div className={styles.loading} role="status" aria-busy="true"><span className="sr-only">Kazançlar yükleniyor…</span>{[0,1,2,3].map(i=><div key={i} aria-hidden="true"/>)}</div>:error?<div className={styles.error} role="alert"><p>{error}</p><Button variant="secondary" onClick={onRetry}>Tekrar dene</Button></div>:summary&&<>
   {empty?<section className={styles.empty}><h2>Henüz kazancın yok</h2><p>İlk tamamlanan ve onaylanan ödeme burada görünecek. Anlaşmaların ve aşama hakedişlerin de bu alandan takip edilecek.</p><Link href="/freelancers/discover">Projeleri keşfet</Link></section>:<dl className={styles.summary}>{[
    {label:"Toplam anlaşma tutarı",value:summary.incompleteAmounts?null:summary.totalEngagement,detail:"Kabul edilen işlerin tutarı"},
    {label:"Onaylanan hakediş",value:summary.incompleteAmounts?null:summary.realizedEarnings,detail:"Onaylanan iş değeri · ödeme değildir"},
    {label:"Bekleyen hakediş",value:summary.incompleteAmounts?null:summary.pendingEarnings,detail:"Henüz onaylanmamış iş değeri"},
    {label:"Bu ay onaylanan",value:summary.approvedThisMonth,detail:"Aşama onay tarihlerine göre"},
   ].map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value===null||item.value===undefined?"Veri eksik":formatCurrency(item.value)}</dd><p>{item.detail}</p></div>)}</dl>}
   {summary.incompleteAmounts&&<p className={styles.dataNote}>Bazı tutar veya proje kayıtları okunamadığı için toplamlar doğrulanamıyor. Mevcut hareketleri aşağıda inceleyebilirsin.</p>}
   <div className={styles.layout}><section className={styles.history} aria-labelledby="earnings-history-title"><div className={styles.sectionHeading}><div><h2 id="earnings-history-title">Kazanç hareketleri</h2><p>Aşama bazında hakediş ve kayıtlı ödeme durumu.</p></div></div>
    {PLATFORM_FEE_MODEL.feePayer==="client"&&<p className={styles.commissionNote}>Platform hizmet bedeli client&apos;a eklenir. Freelancer tutarı ve varsa kesintisi, her hareketin detayında ayrı gösterilir.</p>}
    {(movements?.length??0)>0?<><div className={styles.filters} role="group" aria-label="Kazanç hareketlerini filtrele">{[{id:"all",label:"Tümü"},{id:"approved",label:"Onaylanan"},{id:"pending",label:"Ödeme bekleyen"},...(hasProblem?[{id:"problem",label:"Sorunlu"}]:[])].map(item=><button key={item.id} type="button" aria-pressed={filter===item.id} onClick={()=>{setFilter(item.id as Filter);setVisibleCount(10);}}>{item.label}</button>)}</div>{filtered.length?<MovementTable rows={filtered.slice(0,visibleCount)}/>:<p className={styles.quiet}>Bu filtrede kazanç hareketi bulunmuyor.</p>}{filtered.length>visibleCount&&<button className={styles.more} type="button" onClick={()=>setVisibleCount(count=>count+10)}>Daha fazla hareket göster</button>}</>:<p className={styles.quiet}>Henüz aşama bazında kazanç hareketi yok. {summary.projects.length>0&&"Mevcut anlaşma tutarların üstteki özette yer alıyor."}</p>}
   </section><aside className={styles.withdrawal} aria-labelledby="withdrawal-title"><h2 id="withdrawal-title">Para çekme</h2><dl className={styles.balance}><dt>Kullanılabilir bakiye</dt><dd>Henüz hesaplanamıyor</dd></dl><p>Çekilebilir bakiye ve para çekme talepleri henüz desteklenmiyor. Bu yüzden şu an talep oluşturamazsın.</p><div className={styles.account}><h3>Ödeme hesabı</h3><p>Ödeme hesabı altyapısı henüz bağlı değil. Banka hesabı veya IBAN bilgisi alınmıyor.</p></div><div className={styles.withdrawalHistory}><h3>Para çekme geçmişi</h3><p>Para çekme işlemleri aktif olduğunda taleplerin, durumları ve aktarım bilgileri burada yer alacak.</p></div></aside></div>
  </>}
 </main>;
}
