import Image from "next/image";
import type { ReactNode } from "react";
import { PanelBadge } from "@/components/dashboard/PanelPrimitives";
import styles from "./Coalitions.module.css";

type Metadata = { label: string; value: ReactNode };
type Member = { id: string; name: string; avatarUrl: string | null };

/** Shared anatomy; each role supplies its own data, state and authorized actions. */
export function CoalitionCard({ name, projectTitle, status, members, leadingMetadata = [], metadata = [], statusContent, nextStep, actionBadge, actions }: {
  name: string;
  projectTitle: string;
  status: string;
  members: Member[];
  leadingMetadata?: Metadata[];
  metadata?: Metadata[];
  statusContent: ReactNode;
  nextStep: ReactNode;
  actionBadge?: ReactNode;
  actions: ReactNode;
}) {
  return <article className={styles.card}>
    <div className={styles.cardHeading}>
      <div><h2>{name}</h2><p className={styles.projectName}>{projectTitle}</p></div>
      <div className={styles.labeledBadge}><span>Koalisyon</span><PanelBadge>{status === "active" ? "Aktif" : status === "completed" ? "Tamamlandı" : "Durum bilinmiyor"}</PanelBadge></div>
    </div>
    <dl className={styles.metadata}>
      {leadingMetadata.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
      <div><dt>Ekip</dt><dd className={styles.avatarGroup}>
        {members.slice(0, 4).map(member => <span key={member.id} title={member.name}>
          {member.avatarUrl ? <Image unoptimized src={member.avatarUrl} width={32} height={32} alt="" /> : <span className={styles.avatar}>{member.name.charAt(0)}</span>}
        </span>)}
        <span>{members.length} kişi</span>
      </dd></div>
      {metadata.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
    </dl>
    <div className={styles.statusLine}>{statusContent}</div>
    <div className={styles.cardFooter}>
      <div><p className={styles.actionHeadline}>{nextStep}</p>{actionBadge}</div>
      <div className={styles.actions}>{actions}</div>
    </div>
  </article>;
}
