import type {ReactNode} from "react";
import {ArrowRight} from "lucide-react";
import {PanelBadge,PanelAction} from "@/components/dashboard/PanelPrimitives";
import {projectListStatus} from "./projectListPresentation";
import styles from "./MyProjects.module.css";
export function ProjectListCard({title,description,status,metadata,context,action}:{title:string;description:string|null;status:string|null;metadata:ReactNode;context:string;action:{href:string;label:string}}){const state=projectListStatus(status);return <article className={styles.card}><div className={styles.cardHeading}><h2>{title}</h2><PanelBadge tone={state.tone}>{state.label}</PanelBadge></div><p className={styles.description}>{description||"Proje açıklaması bulunmuyor."}</p><dl className={styles.metadata}>{metadata}</dl><div className={styles.cardFooter}><div><span>Sıradaki adım</span><p>{context}</p></div><PanelAction href={action.href} variant={status==="in_progress"?"primary":"secondary"}>{action.label}<ArrowRight size={16} aria-hidden="true"/></PanelAction></div></article>;}
