"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { panelRootClass } from "@/components/dashboard/PanelPrimitives";
import { addTicketMessage, fetchTicket, fetchTicketMessages, TICKET_STATUS_LABEL, type SupportTicket, type SupportTicketMessage } from "@/lib/support";
import { ticketTone, formatSupportDate } from "@/lib/supportPresentation";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { PanelBadge } from "@/components/dashboard/PanelPrimitives";
import { Loading } from "@/components/common/Loading";
import styles from "./SupportCenter.module.css";

export default function TicketDetail({ ticketId, backHref }: { ticketId: string; backHref: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [ticket, setTicket] = useState<SupportTicket | null>(null), [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [messageError, setMessageError] = useState(""), [reload, setReload] = useState(0);
  const [reply, setReply] = useState(""), [sending, setSending] = useState(false), [sendError, setSendError] = useState("");
  const lock = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError(""); setMessageError(""); setProjectTitle(null); setTicket(null); setMessages([]);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Giriş yapman gerekiyor.");
        const { data, error: ticketError } = await fetchTicket(supabase, ticketId);
        if (ticketError || !data) throw new Error("Destek talebi bulunamadı veya erişim iznin yok.");
        const ownTicket = data as SupportTicket;
        const [thread, project] = await Promise.all([
          fetchTicketMessages(supabase, ticketId),
          ownTicket.related_project_id ? supabase.from("projects").select("title").eq("id", ownTicket.related_project_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        ]);
        if (!active) return;
        setTicket(ownTicket);
        if (thread.error) setMessageError("Talep mesajları yüklenemedi. Tekrar dene.");
        else setMessages((thread.data ?? []) as SupportTicketMessage[]);
        setProjectTitle(project.data?.title ?? null);
      } catch (err) { if (active) setError(err instanceof Error ? err.message : "Talep yüklenemedi."); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [supabase, ticketId, reload]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !reply.trim() || !ticket || ticket.status === "closed") return;
    lock.current = true; setSending(true); setSendError("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Yanıt eklemek için giriş yapmalısın.");
      const { data, error: replyError } = await addTicketMessage(supabase, ticketId, user.id, reply.trim());
      if (replyError || !data) throw new Error(replyError?.message ?? "Yanıt gönderilemedi.");
      if (!alive.current) return;
      setMessages(current => [...current, data as SupportTicketMessage]); setReply("");
    } catch (err) { if (alive.current) setSendError(err instanceof Error ? err.message : "Yanıt gönderilemedi."); }
    finally { lock.current = false; if (alive.current) setSending(false); }
  }
  if (loading) return <div role="status"><Loading label="Destek talebi yükleniyor…" /></div>;
  if (error || !ticket) return <div className={styles.error} role="alert"><p>{error || "Destek talebi bulunamadı."}</p><Link href={backHref}>Destek merkezine dön</Link><Button variant="secondary" onClick={()=>setReload(value=>value+1)}>Tekrar dene</Button></div>;
  return <SupportTicketView ticket={ticket} messages={messages} projectTitle={projectTitle} backHref={backHref} reply={reply} onReply={setReply} onSend={event=>void send(event)} sending={sending} sendError={sendError} messageError={messageError} onRefresh={()=>setReload(value=>value+1)} />;
}

export function SupportTicketView({ ticket, messages, projectTitle, backHref, reply, onReply, onSend, sending, sendError, messageError, onRefresh }: {
 ticket:SupportTicket; messages:SupportTicketMessage[]; projectTitle:string|null; backHref:string; reply:string; onReply:(value:string)=>void; onSend:(event:React.FormEvent<HTMLFormElement>)=>void; sending:boolean; sendError:string; messageError:string; onRefresh:()=>void;
}) {
  const audience = backHref.startsWith("/client") ? "client" : "freelancers";
  return <div className={panelRootClass+" "+styles.root}>
    <Link href={backHref} className={buttonClasses({variant:"secondary"})}><ArrowLeft size={16} aria-hidden />Destek merkezine dön</Link>
    <section className={styles.section}><Card><div className={styles.ticketHeader}><div><p className={styles.meta}>Talep #{ticket.id.slice(0,8)} · {ticket.category??"Genel"}</p><h1>{ticket.subject}</h1></div><span className={styles.status} data-tone={ticketTone(ticket.status)}><PanelBadge tone={ticket.status==="waiting_user"?"warning":ticket.status==="resolved"?"success":ticket.status==="closed"?"neutral":"info"}>{TICKET_STATUS_LABEL[ticket.status]??ticket.status}</PanelBadge></span></div><p className={styles.meta}>Oluşturuldu: {formatSupportDate(ticket.created_at)}<br />Durum son güncellemesi: {formatSupportDate(ticket.updated_at)}</p>
      {ticket.related_project_id && <p className={styles.hint}><Link className={buttonClasses({variant:"link",className:styles.inlineLink})} href={"/"+audience+"/projects/"+ticket.related_project_id}>İlgili proje: {projectTitle??"Projeyi incele"}</Link></p>}
      {ticket.status==="waiting_user" && <p className={styles.hint}>Destek ekibi senden ek bilgi bekliyor. Aşağıdaki yanıt alanından bilgi ekleyebilirsin.</p>}
      <p className={styles.description}>{ticket.description}</p>
    </Card></section>
    <section className={styles.section} aria-labelledby="thread-heading"><div className={styles.heading}><h2 id="thread-heading">Talep geçmişi ve yanıtlar</h2><Button variant="secondary" onClick={onRefresh}>Güncelle</Button></div>
      <p className={styles.meta}>Talep oluşturuldu · {formatSupportDate(ticket.created_at)}</p>
      {messageError ? <p role="alert" className={styles.error}>{messageError}</p> : messages.length ? <ol className={styles.timeline}>{messages.map(message=><li className={styles.message} key={message.id} data-owner={message.sender_id===ticket.user_id}><div className={styles.messageTop}><strong>{message.sender_id===ticket.user_id ? "Sen" : "CollaCrew Destek"}</strong><time className={styles.meta} dateTime={message.created_at}>{formatSupportDate(message.created_at)}</time></div><p>{message.message}</p></li>)}</ol> : <p className={styles.hint}>Henüz ek mesaj yok. Destek ekibinin yanıtları burada görünecek.</p>}
      {sendError && <p role="alert" className={styles.error}>{sendError}</p>}
      {ticket.status==="closed" ? <p className={styles.hint}>Bu talep kapandı. Yeni bir sorun için <Link className={buttonClasses({variant:"link",className:styles.inlineLink})} href={backHref.startsWith("/freelancers")?"/freelancers/help/new":backHref+"#new-request"}>destek talebi oluşturabilirsin.</Link></p> : <form className={styles.reply} onSubmit={onSend}><label>Talebe yanıt ekle<Textarea rows={4} value={reply} maxLength={6000} onChange={event=>onReply(event.target.value)} disabled={sending} required placeholder="Ek bilgilerini veya destek ekibine yanıtını yaz." /></label><Button type="submit" disabled={sending||!reply.trim()}>{sending ? "Yanıt gönderiliyor…" : "Yanıtı gönder"}</Button></form>}
    </section>
  </div>;
}
