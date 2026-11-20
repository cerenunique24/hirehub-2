"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DISPUTE_REASON_LABEL, DISPUTE_STATUS_LABEL } from "@/lib/marketplace/labels";
import { createTicket, fetchHelpArticles, fetchOwnTickets, TICKET_STATUS_LABEL, type HelpArticle, type SupportTicket } from "@/lib/support";
import { formatSupportDate, ticketTone } from "@/lib/supportPresentation";
import { Modal } from "@/components/ui/Modal";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import { PanelBadge, panelRootClass } from "@/components/dashboard/PanelPrimitives";
import HelpCenterHome from "./HelpCenterHome";
import { CLIENT_HELP_CATEGORIES, clientHelpCategory, type ClientHelpCategory } from "./clientHelpPresentation";
import styles from "./SupportCenter.module.css";

type Dispute = { id: string; reason: string; status: string; updated_at: string; projects: { title: string } | null };
export default function HelpAndSupport({ audience, ticketBasePath, projectOptions = [] }: { audience: "client" | "freelancer"; ticketBasePath: string; projectOptions?: Array<{id:string;title:string}> }) {
  const supabase = useMemo(()=>createClient(),[]);
  const [userId,setUserId]=useState<string|null>(null);
  const [articles,setArticles]=useState<HelpArticle[]>([]),[tickets,setTickets]=useState<SupportTicket[]>([]),[disputes,setDisputes]=useState<Dispute[]>([]);
  const [loading,setLoading]=useState(true),[faqError,setFaqError]=useState(""),[ticketError,setTicketError]=useState(""),[disputeError,setDisputeError]=useState(""),[reload,setReload]=useState(0);
  const [search,setSearch]=useState(""),[activeCategory,setActiveCategory]=useState<ClientHelpCategory|null>(null),[expandedId,setExpandedId]=useState<string|null>(null),[allFaq,setAllFaq]=useState(false);
  const [view,setView]=useState<"home"|"tickets"|"disputes"|"safety">("home");
  const [showForm,setShowForm]=useState(false),[subject,setSubject]=useState(""),[category,setCategory]=useState("Genel"),[description,setDescription]=useState(""),[relatedProjectId,setRelatedProjectId]=useState("");
  const [priority,setPriority]=useState<"low"|"normal"|"high">("normal"),[submitting,setSubmitting]=useState(false),[formError,setFormError]=useState(""),[formSuccess,setFormSuccess]=useState("");
  const submitLock=useRef(false), panelRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(view!=="home")panelRef.current?.focus();},[view]);
  useEffect(()=>{
    if(typeof window === "undefined")return;
    const openFromHash=()=>{if(window.location.hash === "#new-request")setShowForm(true);};
    openFromHash();window.addEventListener("hashchange",openFromHash);
    return ()=>window.removeEventListener("hashchange",openFromHash);
  },[]);
  useEffect(()=>{
    let active=true;
    async function load(){
      setLoading(true);setFaqError("");setTicketError("");setDisputeError("");
      try {
        const {data:{user},error:authError}=await supabase.auth.getUser();
        if(authError || !user) throw new Error("Yardım ve destek için giriş yapmalısın.");
        const [faq,own,disputeRows]=await Promise.all([
          fetchHelpArticles(supabase,audience),fetchOwnTickets(supabase,user.id),
          supabase.from("disputes").select("id, reason, status, updated_at, projects(title)").order("updated_at",{ascending:false}),
        ]);
        if(!active)return;
        setUserId(user.id);setArticles(faq.error?[]:(faq.data??[]) as HelpArticle[]);setTickets(own.error?[]:(own.data??[]) as SupportTicket[]);setDisputes(disputeRows.error?[]:(disputeRows.data??[]) as unknown as Dispute[]);
        if(faq.error)setFaqError("Yardım içerikleri yüklenemedi.");
        if(own.error)setTicketError("Destek taleplerin yüklenemedi.");
        if(disputeRows.error)setDisputeError("Uyuşmazlık kayıtları yüklenemedi.");
      } catch(error){if(active){const text=error instanceof Error?error.message:"Destek kayıtları yüklenemedi.";setFaqError(text);setTicketError(text);setDisputeError(text);}}
      finally{if(active)setLoading(false);}
    }
    void load();return ()=>{active=false;};
  },[supabase,audience,reload]);
  const query=search.trim().toLocaleLowerCase("tr-TR");
  const filtered=articles.filter(article=>(!activeCategory || clientHelpCategory(article.category)===activeCategory)&&(!query || `${article.question} ${article.answer} ${article.category}`.toLocaleLowerCase("tr-TR").includes(query)));
  const openTicket=[...tickets].sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at)).find(ticket=>["open","in_progress","waiting_user"].includes(ticket.status));
  function openForm(nextCategory?: string){if(nextCategory)setCategory(nextCategory);setFormError("");setFormSuccess("");setShowForm(true);}
  async function handleCreateTicket(){
    if(submitLock.current)return;
    setFormError("");setFormSuccess("");
    if(!subject.trim()||!description.trim()){setFormError("Konu ve açıklama gerekli.");return;}
    if(relatedProjectId && !projectOptions.some(project=>project.id===relatedProjectId)){setFormError("Geçerli bir ilgili proje seç.");return;}
    submitLock.current=true;setSubmitting(true);
    try {
      let effectiveUserId=userId;
      if(!effectiveUserId){const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Destek talebi oluşturmak için giriş yapmalısın. Lütfen sayfayı yenileyip tekrar dene.");effectiveUserId=user.id;setUserId(user.id);}
      const {error}=await createTicket(supabase,{userId:effectiveUserId,subject:subject.trim(),category,description:description.trim(),relatedProjectId:relatedProjectId||null,priority});
      if(error)throw new Error(error.message||"Destek talebi oluşturulamadı.");
      setFormSuccess("Destek talebin oluşturuldu.");setSubject("");setDescription("");setRelatedProjectId("");setPriority("normal");setShowForm(false);
      const refreshed=await fetchOwnTickets(supabase,effectiveUserId);
      if(refreshed.error)setTicketError("Talebin oluşturuldu ancak talep listesi yenilenemedi.");else{setTickets((refreshed.data??[]) as SupportTicket[]);setTicketError("");}
    }catch(error){setFormError(error instanceof Error?error.message:"Destek talebi oluşturulamadı.");}
    finally{submitLock.current=false;setSubmitting(false);}
  }
  return <>
    {view === "home" ? <HelpCenterHome audience={audience} categories={CLIENT_HELP_CATEGORIES.map(item=>({...item,active:activeCategory===item.id,onClick:()=>{setActiveCategory(current=>current===item.id?null:item.id);setExpandedId(null);}}))} search={search} onSearch={setSearch} articles={allFaq?filtered:filtered.slice(0,5)} loading={loading} faqError={faqError} ticketError={ticketError} expandedFaq={expandedId} onToggleFaq={id=>setExpandedId(current=>current===id?null:id)} openTicket={openTicket} ticketHref={id=>`${ticketBasePath}/${id}`} onRetry={()=>setReload(value=>value+1)} createAction={{onClick:()=>openForm()}} ticketsAction={{onClick:()=>setView("tickets")}} faqAction={{onClick:()=>{setAllFaq(true);setActiveCategory(null);}}} disputeAction={{onClick:()=>setView("disputes")}} safetyAction={{onClick:()=>setView("safety")}} filterLabel={activeCategory?CLIENT_HELP_CATEGORIES.find(item=>item.id===activeCategory)?.label:undefined} onClearFilter={()=>setActiveCategory(null)} success={formSuccess}/> : <div ref={panelRef} tabIndex={-1} className={`${panelRootClass} ${styles.root}`}>
      <Button variant="link" onClick={()=>setView("home")}><ArrowLeft size={16} aria-hidden/>Yardım merkezine dön</Button>
      <PageHeader title={view==="tickets"?"Destek Taleplerim":view==="disputes"?"Teslim / ödeme uyuşmazlığı":"Güvenlik / kullanıcı bildirimi"}/>
      {view==="tickets" && <section className={styles.section} aria-label="Destek taleplerin">{loading?<p role="status">Destek taleplerin yükleniyor…</p>:ticketError?<p role="alert" className={styles.error}>{ticketError}<Button onClick={()=>setReload(value=>value+1)}>Tekrar dene</Button></p>:tickets.length?<div className={styles.list}>{tickets.map(ticket=><Link key={ticket.id} href={`${ticketBasePath}/${ticket.id}`} className={styles.ticket}><div><span className={styles.meta}>#{ticket.id.slice(0,8)}</span><h3>{ticket.subject}</h3><p className={styles.meta}>Son güncelleme: {formatSupportDate(ticket.updated_at)}</p></div><span data-tone={ticketTone(ticket.status)}><PanelBadge tone={ticket.status==="waiting_user"?"warning":ticket.status==="closed"||ticket.status==="resolved"?"neutral":"info"}>{TICKET_STATUS_LABEL[ticket.status]}</PanelBadge></span></Link>)}</div>:<p className={styles.meta}>Henüz bir destek talebin yok.</p>}</section>}
      {view==="disputes" && <section className={styles.section}><div className={styles.guidance}><h2>İlgili projenin çalışma alanını aç</h2><div className={styles.routeChoice}>{projectOptions.map(project=><Link key={project.id} href={`/client/projects/${project.id}`}>{project.title} <ArrowRight size={16} aria-hidden/></Link>)}{!projectOptions.length&&<Link href="/client/projects">Projelerimi aç <ArrowRight size={16} aria-hidden/></Link>}</div></div>{loading?<p role="status">Uyuşmazlık kayıtları yükleniyor…</p>:disputeError?<p role="alert" className={styles.error}>{disputeError}<Button onClick={()=>setReload(value=>value+1)}>Tekrar dene</Button></p>:disputes.length?<div className={styles.list}>{disputes.map(dispute=><Link key={dispute.id} href={`/client/help/disputes/${dispute.id}`} className={styles.ticket}><div><h3>{dispute.projects?.title??"Proje"}</h3><p>{DISPUTE_REASON_LABEL[dispute.reason]??dispute.reason}</p><p className={styles.meta}>Son güncelleme: {formatSupportDate(dispute.updated_at)}</p></div><PanelBadge>{DISPUTE_STATUS_LABEL[dispute.status]??dispute.status}</PanelBadge></Link>)}</div>:<p className={styles.meta}>Bir uyuşmazlığın bulunmuyor.</p>}</section>}
      {view==="safety" && <section className={styles.guidance}><h2>Güvenlik için doğru yolu seç</h2><p>Taciz veya kötüye kullanım için ilgili konuşmayı açıp Şikayet Et aksiyonunu kullan.</p><div className={styles.actions}><Link href="/client/messages" className={buttonClasses({variant:"secondary"})}>Bildirmek için konuşmayı aç</Link><Button variant="secondary" onClick={()=>openForm("Hesap")}>Hesap erişimi için destek</Button></div></section>}
    </div>}
    <Modal open={showForm} onClose={()=>{if(!submitting)setShowForm(false);}} title="Yeni Destek Talebi" description="Ekibimiz talebini inceleyip en kısa sürede dönüş yapacak." footer={<><Button type="button" variant="ghost" onClick={()=>setShowForm(false)} disabled={submitting}>Vazgeç</Button><Button type="button" onClick={()=>void handleCreateTicket()} loading={submitting} disabled={submitting}>Gönder</Button></>}>
      <div className="space-y-3">{formError&&<p role="alert" className="text-sm text-[var(--color-error-600)]">{formError}</p>}
        <Input aria-label="Konu" disabled={submitting} value={subject} onChange={event=>setSubject(event.target.value)} placeholder="Konu"/>
        <Select aria-label="Kategori" disabled={submitting} value={category} onChange={event=>setCategory(event.target.value)} options={[{label:"Genel",value:"Genel"},{label:"Hesap",value:"Hesap"},{label:"Proje",value:"Proje"},{label:"Ödeme",value:"Ödeme"},{label:"Teknik sorun",value:"Teknik sorun"}]}/>
        {projectOptions.length>0&&<Select aria-label="İlgili proje" disabled={submitting} value={relatedProjectId} onChange={event=>setRelatedProjectId(event.target.value)} options={[{label:"İlgili proje (opsiyonel)",value:""},...projectOptions.map(project=>({label:project.title,value:project.id}))]}/>}
        <Select aria-label="Öncelik" disabled={submitting} value={priority} onChange={event=>setPriority(event.target.value as "low"|"normal"|"high")} options={[{label:"Düşük öncelik",value:"low"},{label:"Normal öncelik",value:"normal"},{label:"Yüksek öncelik",value:"high"}]}/>
        <Textarea aria-label="Açıklama" disabled={submitting} value={description} onChange={event=>setDescription(event.target.value)} placeholder="Açıklama" rows={4}/>
      </div>
    </Modal>
  </>;
}
