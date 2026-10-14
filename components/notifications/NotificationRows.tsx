"use client";
import { Bell, FolderKanban, FileText, UsersRound, Wallet, ShieldCheck, LifeBuoy, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PanelBadge } from "@/components/dashboard/PanelPrimitives";
import styles from "./NotificationRows.module.css";
export type NotificationRow = { id:string; type?:string; title:string; message:string|null; link:string|null; is_read:boolean; created_at:string };
export function NotificationRows({notifications,getType,formatDate,onOpen}:{notifications:NotificationRow[];getType:(type:string)=>string;formatDate:(value:string)=>string;onOpen:(notification:NotificationRow)=>void}) {
 return <ul className={styles.list} aria-label="Bildirimler">{notifications.map(notification=>{
  const type=getType(notification.type ?? "");
  const Icon=type==="Proje"?FolderKanban:type==="Teklif"?FileText:type==="Ekip"?UsersRound:type==="Finans"?Wallet:type==="Destek"?LifeBuoy:type==="Güvenlik"?ShieldCheck:type==="Mesaj"?MessageSquare:Bell;
  return <li key={notification.id} className={styles.row} data-unread={!notification.is_read}>
   <div className={styles.icon} aria-hidden="true"><Icon size={16} strokeWidth={1.7}/></div>
   <div className={styles.content}><div className={styles.title}><h2>{notification.title}</h2>{!notification.is_read&&<span className={styles.dot} role="img" aria-label="Okunmamış"/>}</div>
    {notification.message&&<p className={styles.description}>{notification.message}</p>}
    <div className={styles.metadata}>{type&&<PanelBadge>{type}</PanelBadge>}<time dateTime={notification.created_at}>{formatDate(notification.created_at)}</time></div>
   </div>
   {notification.link?<Button variant="secondary" size="sm" onClick={()=>onOpen(notification)}>Görüntüle</Button>:!notification.is_read?<Button variant="ghost" size="sm" onClick={()=>onOpen(notification)}>Okundu işaretle</Button>:null}
  </li>;
 })}</ul>;
}
