import Image from "next/image";
import type { ReactNode } from "react";
import { PanelBadge } from "@/components/dashboard/PanelPrimitives";
import styles from "./Coalitions.module.css";

type Metadata = { label: string; value: ReactNode };
type Member = { id: string; name: string; avatarUrl: string | null };

/** Shared anatomy; each role supplies its own data, state and authorized actions. */
export function CoalitionCard({ name, projectTitle, status, members, leadingMetadata = [], metadata = [], statusContent, projectStatus, projectStatusLabel, nextStep, actionBadge, actions }: {
  name: string;
  projectTitle: string;
  status: string;
  members: Member[];
  leadingMetadata?: Metadata[];
  metadata?: Metadata[];
  statusContent: ReactNode;
  projectStatus?: string;
  projectStatusLabel?: string;
  nextStep: ReactNode;
  actionBadge?: ReactNode;
  actions: ReactNode;
}) {
  const showNextStep = nextStep !== "Çalışma devam ediyor" || projectStatus !== "in_progress";
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
    <div className={styles.statusLine}>{projectStatusLabel && <><span>Proje</span><span className={styles.projectStatus} data-status={projectStatus}>{projectStatus === "in_progress" && <span className={styles.liveDot} aria-hidden="true"/>}{projectStatusLabel}</span></>}{statusContent}</div>
    <div className={styles.cardFooter}>
      {(showNextStep || actionBadge) && <div>{showNextStep && <p className={styles.actionHeadline}>{nextStep}</p>}{actionBadge}</div>}
      <div className={styles.actions}>{actions}</div>
    </div>
  </article>;
}
