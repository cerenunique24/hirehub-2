"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Wallet, Layers, FileText, MessageCircle, UserRound, Wrench, ShieldCheck, Scale, ArrowUpRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { panelRootClass } from "@/components/dashboard/PanelPrimitives";
import { createTicket, fetchHelpArticles, fetchOwnTickets, TICKET_STATUS_LABEL, type HelpArticle, type SupportTicket } from "@/lib/support";
import { SUPPORT_TOPICS, topicFor, ticketDraft, ticketPriority, ticketTone, disputeTone, formatSupportDate, openTicketCount, type SupportTopicId } from "@/lib/supportPresentation";
import { DISPUTE_REASON_LABEL, DISPUTE_STATUS_LABEL } from "@/lib/marketplace/labels";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PanelBadge } from "@/components/dashboard/PanelPrimitives";
import { Loading } from "@/components/common/Loading";
import { EmptyState } from "@/components/common/EmptyState";
import styles from "./SupportCenter.module.css";

type Project = { id: string; title: string };
type Dispute = { id: string; reason: string; status: string; updated_at: string; projects: { title: string } | { title: string }[] | null };
export type HelpView = "home" | "faq" | "new" | "tickets" | "disputes" | "safety" | "topic";
const ICONS = [Wallet, Layers, FileText, MessageCircle, UserRound, Wrench];

export default function FreelancerSupportCenter({ view = "home", initialTopic = "technical" }: { view?: HelpView; initialTopic?: SupportTopicId }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [reload, setReload] = useState(0);
  const [articles, setArticles] = useState<HelpArticle[]>([]), [tickets, setTickets] = useState<SupportTicket[]>([]), [projects, setProjects] = useState<Project[]>([]), [disputes, setDisputes] = useState<Dispute[]>([]);
  const [faqError, setFaqError] = useState(""), [disputeError, setDisputeError] = useState("");
  const [topicId, setTopicId] = useState<SupportTopicId>(initialTopic), [issue, setIssue] = useState<string>(topicFor(initialTopic).issues[0][0]);
  const [subject, setSubject] = useState(""), [description, setDescription] = useState(""), [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false), [formError, setFormError] = useState(""), [success, setSuccess] = useState("");
  const submitLock = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError(""); setFaqError(""); setDisputeError("");
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Yardım ve destek için giriş yapmalısın.");
        const [faq, own, membership, disputeRows] = await Promise.all([
          ["home", "faq", "topic"].includes(view) ? fetchHelpArticles(supabase, "freelancer") : Promise.resolve({data:[],error:null}),
          view === "tickets" ? fetchOwnTickets(supabase, user.id) : Promise.resolve({data:[],error:null}),
          ["new", "disputes"].includes(view) ? supabase.from("project_team_members").select("project_id").eq("freelancer_id", user.id) : Promise.resolve({data:[],error:null}),
          view === "disputes" ? supabase.from("disputes").select("id,reason,status,updated_at,projects(title)").order("updated_at", { ascending: false }) : Promise.resolve({data:[],error:null}),
        ]);
        if (own.error || membership.error) throw new Error("Destek kayıtların yüklenemedi. Tekrar dene.");
        const ids = [...new Set((membership.data ?? []).map(row => row.project_id))];
        const projectRows = ids.length ? await supabase.from("projects").select("id,title").in("id", ids) : { data: [], error: null };
        if (projectRows.error) throw new Error("İlgili projelerin yüklenemedi.");
        if (!active) return;
        setTickets((own.data ?? []) as SupportTicket[]); setProjects(projectRows.data ?? []);
        setArticles((faq.data ?? []) as HelpArticle[]); setDisputes((disputeRows.data ?? []) as Dispute[]);
        if (faq.error) setFaqError("Yardım içerikleri yüklenemedi.");
        if (disputeRows.error) setDisputeError("Uyuşmazlık kayıtları yüklenemedi.");
      } catch (err) { if (active) setError(err instanceof Error ? err.message : "Destek merkezi yüklenemedi."); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [supabase, reload, view]);

  function chooseTopic(id: SupportTopicId, preferredIssue?: string) {
    const selected = topicFor(id);
    setTopicId(id); setIssue(preferredIssue ?? selected.issues[0][0]); setFormError(""); setSuccess("");
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true; setSubmitting(true); setFormError(""); setSuccess("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Destek talebi için giriş yapmalısın.");
      if (projectId && !projects.some(project => project.id === projectId)) throw new Error("Geçerli bir ilgili proje seç.");
      const input = ticketDraft({ userId: user.id, topic: topicId, issue, subject, description, projectId });
      const { data, error: createError } = await createTicket(supabase, input);
      if (createError || !data) throw new Error(createError?.message ?? "Destek talebi oluşturulamadı.");
      if (!alive.current) return;
      setTickets(current => [data as SupportTicket, ...current]); setSubject(""); setDescription(""); setProjectId("");
      setSuccess("Destek talebin oluşturuldu. Durumunu Destek Taleplerim ekranından takip edebilirsin.");
    } catch (err) { if (alive.current) setFormError(err instanceof Error ? err.message : "Destek talebi oluşturulamadı."); }
    finally { submitLock.current = false; if (alive.current) setSubmitting(false); }
  }
  const topic = topicFor(topicId);
  const query = search.trim().toLocaleLowerCase("tr-TR");
  const filtered = articles.filter(article => !query || (article.question + " " + article.answer + " " + article.category).toLocaleLowerCase("tr-TR").includes(query));
  const shown = ["home","topic"].includes(view) ? filtered.slice(0, 5) : filtered;
  return <div className={panelRootClass + " " + styles.root}>
    {view!=="home" && <Link className={buttonClasses({variant:"link"})} href="/freelancers/help">Yardım merkezine dön</Link>}
    <PageHeader className={styles.header} title={view==="home"?"Yardım Merkezi":view==="new"?"Yeni destek talebi":view==="tickets"?"Destek Taleplerim":view==="faq"?"Sık Sorulan Sorular":view==="disputes"?"Resmi uyuşmazlıklar":view==="safety"?"Güvenlik ve hesap erişimi":topic.label} description={view==="home"?"Doğru yardım konusunu bul, yanıtları incele veya destek al.":view==="new"?"Sorununu ve ilgili proje bağlamını destek ekibine ilet.":view==="tickets"?"Mevcut taleplerinin durumunu ve yanıtlarını takip et.":view==="faq"?"CollaCrew kullanımı hakkında mevcut yardım içeriklerini incele.":view==="disputes"?"Teslim ve ödeme anlaşmazlıklarını destek taleplerinden ayrı takip et.":view==="safety"?"Hesap erişimi veya kötüye kullanım için doğru akışı seç.":topic.guide} />
    {["home","faq","topic"].includes(view) && <label className={styles.search}><Search size={18} aria-hidden /><Input aria-label="Yardım içeriklerinde ara" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Yardım içeriklerinde ara" /></label>}
    {loading ? <div role="status"><Loading label="Destek merkezin yükleniyor…" /></div> : error ? <div role="alert" className={styles.error}>{error}<div><Button variant="secondary" onClick={() => setReload(value => value + 1)}>Tekrar dene</Button></div></div> : <>
      {view==="home" && <section className={styles.section} aria-labelledby="topics-heading"><h2 id="topics-heading">Hangi konuda yardıma ihtiyacın var?</h2><div className={styles.topics}>{SUPPORT_TOPICS.map((item,index)=>{const Icon=ICONS[index];return <Link key={item.id} href={"/freelancers/help/topics/"+item.id}><Card density="compact" hoverable><div className={styles.hubTopic}><Icon size={16} aria-hidden /><div><h3>{item.label}</h3><p>{item.id==="payment"?"Ödeme ve kazanç durumları":item.id==="project"?"Aşama, teslim ve revizyon":item.id==="proposal"?"Teklif ve davet durumları":item.id==="messages"?"Konuşmalar ve mesaj iletimi":item.id==="account"?"Hesap erişimi ve profil":"Teknik sorunlar ve diğer konular"}</p></div><ArrowUpRight size={16} aria-hidden /></div></Card></Link>;})}</div><div className={styles.actions}><Link href="/freelancers/help/disputes" className={buttonClasses({variant:"link"})}><Scale size={16} aria-hidden />Teslim / ödeme uyuşmazlığı</Link><Link href="/freelancers/help/safety" className={buttonClasses({variant:"link"})}><ShieldCheck size={16} aria-hidden />Güvenlik / kullanıcı bildirimi</Link></div></section>}
      {["topic","safety","disputes"].includes(view) && <section className={styles.section}>        <div className={styles.guidance}>
          {view === "disputes" ? <><h3>Uyuşmazlık için ilgili projeyi aç</h3><p>Teslim veya aşama ödemesi anlaşmazlığı için çalışma alanındaki Yönetim sekmesinin Uyuşmazlık merkezi alanını kullan. Bu işlem destek talebinden ayrı takip edilir.</p><div className={styles.routeChoice}>{projects.length ? projects.map(project => <Link key={project.id} href={"/freelancers/projects/"+project.id}>{project.title} · Çalışma alanını aç <ArrowUpRight size={14} aria-hidden /></Link>) : <p>Uyuşmazlık başlatabileceğin ilişkili proje bulunmuyor.</p>}</div></>
          : view === "safety" ? <><h3>Güvenlik için doğru yolu seç</h3><p>Taciz veya kötüye kullanım için ilgili konuşmayı açıp kullanıcı menüsündeki Şikayet Et aksiyonunu kullan.</p><div className={styles.actions}><Link className={buttonClasses({variant:"secondary"})} href="/freelancers/messages">Bildirmek için konuşmayı aç</Link><Link className={buttonClasses({variant:"secondary"})} href="/freelancers/help/new?topic=account">Hesap erişimi için destek</Link></div></>
          : <><h3>{topic.label}</h3><p>{topic.guide}</p><div className={styles.actions}>{topic.href && <Link href={topic.href} className={buttonClasses({variant:"secondary"})}>İlgili ekranı aç <ArrowUpRight size={14} aria-hidden /></Link>}<Link href={"/freelancers/help/new?topic="+topic.id} className={buttonClasses({variant:"secondary"})}>Bu konuda destek al</Link></div></>}
        </div>
      </section>}
      {["home","faq","topic"].includes(view) && <section className={styles.section} aria-labelledby="faq-heading"><div className={styles.heading}><h2 id="faq-heading">Sık Sorulan Sorular</h2>{view!=="faq" && <Link href="/freelancers/help/faq" className={buttonClasses({variant:"link"})}>Tüm soruları gör</Link>}</div>
        {faqError ? <p role="alert" className={styles.error}>{faqError}<Button variant="secondary" onClick={()=>setReload(value=>value+1)}>Tekrar dene</Button></p> : shown.length ? shown.map(article=><details className={styles.faq} key={article.id}><summary>{article.question}</summary><p>{article.answer}</p></details>) : <p className={styles.meta}>{query ? "Aramanla eşleşen yardım içeriği bulunamadı." : "Şu an yardım makalesi bulunmuyor. İlgili ekranı inceleyebilir veya destek talebi oluşturabilirsin."}</p>}
      </section>}
      {view==="new" && <section id="new-request" className={styles.section} aria-labelledby="request-heading"><h2 id="request-heading">Yeni destek talebi oluştur</h2><Card>
        <p className={styles.hint}>Önce ilgili ekranı kontrol et. Sorun devam ediyorsa hangi adımda ne olduğunu açıklayarak talep oluştur.</p>
        {formError && <p role="alert" className={styles.error}>{formError}</p>}{success && <p role="status" className={styles.success}>{success}</p>}
        <form className={styles.form} onSubmit={event=>void submit(event)}>
          <div className={styles.field}><label htmlFor="support-category">Kategori</label><Select id="support-category" disabled={submitting} value={topicId} onChange={event=>chooseTopic(event.target.value as SupportTopicId)} options={SUPPORT_TOPICS.map(item=>({value:item.id,label:item.label}))} /></div>
          <div className={styles.field}><label htmlFor="support-issue">Sorun türü</label><Select id="support-issue" disabled={submitting} value={issue} onChange={event=>setIssue(event.target.value)} options={topic.issues.map(([value,label])=>({value,label}))} /></div>
          <label className={styles.full}>Konu<Input required maxLength={180} disabled={submitting} value={subject} onChange={event=>setSubject(event.target.value)} placeholder="Sorununu kısaca özetle" /></label>
          {projects.length>0 && <div className={styles.full+" "+styles.field}><label htmlFor="support-project">İlgili proje (isteğe bağlı)</label><Select id="support-project" value={projectId} disabled={submitting} onChange={event=>setProjectId(event.target.value)} options={[{value:"",label:"Proje ile ilişkilendirme"},...projects.map(project=>({value:project.id,label:project.title}))]} /></div>}
          <label className={styles.full}>Açıklama<Textarea required rows={5} maxLength={6000} disabled={submitting} value={description} onChange={event=>setDescription(event.target.value)} placeholder="İlgili ekranı, yaptığın işlemi ve karşılaştığın sorunu anlat." /></label>
          <div className={styles.full+" "+styles.heading}><span className={styles.meta}>Öncelik: {ticketPriority(issue)==="high" ? "Yüksek" : "Normal"} · Sorun türüne göre belirlenir.</span><Button type="submit" disabled={submitting}>{submitting ? "Talep oluşturuluyor…" : "Destek talebi oluştur"}</Button></div>
        </form>
      </Card><div className={styles.actions}><Link href="/freelancers/help/tickets" className={buttonClasses({variant:"secondary"})}>Taleplerimi gör</Link>{success && tickets[0] && <Link href={"/freelancers/help/tickets/"+tickets[0].id} className={buttonClasses()}>Oluşturulan talebi aç</Link>}</div></section>}
      {view==="tickets" && <section id="my-tickets" className={styles.section} aria-labelledby="tickets-heading"><div className={styles.heading}><h2 id="tickets-heading">Destek Taleplerim</h2><span className={styles.meta}>{openTicketCount(tickets)} açık talep</span></div>{tickets.length ? <div className={styles.list}>{tickets.map(ticket=><Link className={styles.ticket} key={ticket.id} href={"/freelancers/help/tickets/"+ticket.id}><div><span className={styles.meta}>#{ticket.id.slice(0,8)} · {ticket.category ?? "Genel"}</span><h3>{ticket.subject}</h3><p className={styles.meta}>Oluşturuldu: {formatSupportDate(ticket.created_at)}<br />Son güncelleme: {formatSupportDate(ticket.updated_at)}</p></div><span className={styles.status} data-tone={ticketTone(ticket.status)}><PanelBadge tone={ticket.status==="waiting_user"?"warning":ticket.status==="resolved"?"success":ticket.status==="closed"?"neutral":"info"}>{TICKET_STATUS_LABEL[ticket.status]??ticket.status}</PanelBadge></span></Link>)}</div> : <EmptyState className={styles.empty} title="Henüz destek talebin yok" description="Bir sorun yaşadığında yeni talep oluşturabilirsin." action={<Link href="/freelancers/help/new" className={buttonClasses()}>Yeni destek talebi</Link>} />}</section>}
      {view==="disputes" && <section className={styles.section} aria-labelledby="disputes-heading"><h2 id="disputes-heading">Resmi uyuşmazlıkların</h2><p className={styles.hint}>Destek taleplerinden ayrı yürütülen proje, teslim ve ödeme incelemeleri.</p>{disputeError ? <p role="alert" className={styles.error}>{disputeError}<Button variant="secondary" onClick={()=>setReload(value=>value+1)}>Tekrar dene</Button></p> : disputes.length ? <div className={styles.list}>{disputes.map(dispute=>{const project=Array.isArray(dispute.projects)?dispute.projects[0]:dispute.projects;return <Link key={dispute.id} href={"/freelancers/help/disputes/"+dispute.id} className={styles.ticket}><div><h3>{project?.title??"Proje uyuşmazlığı"}</h3><p>{DISPUTE_REASON_LABEL[dispute.reason]??dispute.reason}</p><p className={styles.meta}>Son güncelleme: {formatSupportDate(dispute.updated_at)}</p></div><span className={styles.status} data-tone={disputeTone(dispute.status)}><PanelBadge tone={dispute.status==="resolved"?"success":dispute.status==="closed"?"neutral":"info"}>{DISPUTE_STATUS_LABEL[dispute.status]??dispute.status}</PanelBadge></span></Link>;})}</div> : <p className={styles.meta}>Mevcut bir uyuşmazlık kaydın yok.</p>}</section>}
      {view==="home" && <section className={styles.actions} aria-label="Destek işlemleri"><Link href="/freelancers/help/new" className={buttonClasses()}>Destek talebi oluştur</Link><Link href="/freelancers/help/tickets" className={buttonClasses({variant:"secondary"})}>Taleplerim</Link></section>}
    </>}
  </div>;
}
