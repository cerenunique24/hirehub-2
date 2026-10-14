import type { SupportTicket, TicketStatus } from "./support";
export const SUPPORT_TOPICS = [
 { id:"payment", category:"Ödeme", label:"Ödeme / Kazanç", href:"/freelancers/earnings", guide:"Kazanç hareketlerini ve ödeme durumlarını incele.", issues:[["payment_blocked","Ödeme alınmadı"],["balance","Bakiye hatası"],["withdrawal","Para çekme"],["commission","Komisyon"]] },
 { id:"project", category:"Proje", label:"Proje / Aşamalar", href:"/freelancers/projects", guide:"Aşama, teslim ve revizyon durumlarını çalışma alanında incele.", issues:[["milestone","Aşama"],["delivery","Teslim"],["revision","Revizyon"],["project_other","Diğer proje sorunu"]] },
 { id:"proposal", category:"Teklif / Davet", label:"Teklif / Davet", href:"/freelancers/proposals", guide:"Teklif ve davetlerinin mevcut durumunu kontrol et.", issues:[["proposal_missing","Teklif görünmüyor"],["invitation","Davet"],["proposal_other","Diğer teklif sorunu"]] },
 { id:"messages", category:"Mesajlaşma", label:"Mesajlaşma", href:"/freelancers/messages", guide:"İlgili konuşmayı açarak mesajlarını kontrol et.", issues:[["message_delivery","Mesaj iletilemiyor"],["message_other","Diğer mesaj sorunu"]] },
 { id:"account", category:"Hesap", label:"Hesap / Profil", href:"/freelancers/profile", guide:"Profil bilgilerini ve hesap ayarlarını incele.", issues:[["account_access","Hesap erişimi"],["profile","Profil bilgileri"],["account_other","Diğer hesap sorunu"]] },
 { id:"technical", category:"Teknik sorun", label:"Teknik Sorun", href:null, guide:"Hangi ekranda sorun yaşadığını ve tekrarlama adımlarını açıklayarak talep oluştur.", issues:[["page_error","Sayfa çalışmıyor"],["upload_error","Yükleme sorunu"],["technical_other","Diğer teknik sorun"]] },
] as const;
export type SupportTopicId = typeof SUPPORT_TOPICS[number]["id"];
export function topicFor(id: string) { return SUPPORT_TOPICS.find(topic=>topic.id===id) ?? SUPPORT_TOPICS[5]; }
export function ticketPriority(issue: string): "normal" | "high" { return ["payment_blocked","account_access"].includes(issue) ? "high" : "normal"; }
export function ticketDraft(input:{userId:string;topic:SupportTopicId;issue:string;subject:string;description:string;projectId:string}) {
 const topic=topicFor(input.topic);if(topic.id!==input.topic)throw new Error("Geçerli bir kategori seç.");const issue=topic.issues.find(item=>item[0]===input.issue);
 if(!issue||!input.subject.trim()||!input.description.trim())throw new Error("Konu, sorun türü ve açıklama gerekli.");
 return {userId:input.userId,category:topic.category,subject:input.subject.trim(),description:"Sorun türü: "+issue[1]+"\n\n"+input.description.trim(),relatedProjectId:input.projectId||null,priority:ticketPriority(issue[0])};
}
export function ticketTone(status:string) {return ({open:"open",in_progress:"review",waiting_user:"waiting",resolved:"resolved",closed:"closed"} as Record<TicketStatus,string>)[status as TicketStatus]??"closed";}
export function disputeTone(status:string) {return ({open:"open",under_review:"review",resolved:"resolved",closed:"closed"} as Record<string,string>)[status]??"closed";}
export function formatSupportDate(value:string) {const date=new Date(value);return Number.isNaN(date.getTime())?"Tarih bilinmiyor":date.toLocaleString("tr-TR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}
export function openTicketCount(tickets:SupportTicket[]) {return tickets.filter(ticket=>["open","in_progress","waiting_user"].includes(ticket.status)).length;}
