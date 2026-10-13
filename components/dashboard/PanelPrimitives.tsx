import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Badge as SharedBadge, type BadgeTone } from "@/components/ui/Badge";
import { buttonClasses, type ButtonVariant } from "@/components/ui/Button";
import styles from "./PanelPrimitives.module.css";
import { panelBadgeTone, type PanelTone } from "./badgeSemantics";

export const panelRootClass = styles.root;
export type { PanelTone } from "./badgeSemantics";
const tones: Record<PanelTone, BadgeTone> = { neutral: "neutral", info: "primary", success: "success", warning: "warning", revision: "warning", danger: "error" };

/** Role-neutral UI: dashboard content and workflow remain with each role. */
export function PanelBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: PanelTone }) {
 const semanticTone = typeof children === "string" ? panelBadgeTone(children, tone) : tone;
 return <span data-panel-tone={semanticTone} className={styles.badgeHost}><SharedBadge tone={tones[semanticTone]} className={styles.badge}>{children}</SharedBadge></span>;
}
export function PanelAction({ href, children, variant = "secondary", className = "" }: { href: string; children: ReactNode; variant?: ButtonVariant; className?: string }) {
 return <Link href={href} className={buttonClasses({ variant, size: "sm", className: [styles.action, className].join(" ") })}>{children}</Link>;
}
export function PanelSection({ title, children, href, label = "Tümünü gör", className = "", count }: { title: string; children: ReactNode; href?: string; label?: string; className?: string; count?: number }) {
 return <section className={[styles.card, className].join(" ")} aria-label={title}><div className={styles.heading}><h2>{title}{count !== undefined && <span className={styles.count}>{count}</span>}</h2>{href && <Link href={href} className={styles.link}>{label}<ChevronRight size={16} aria-hidden="true" /></Link>}</div>{children}</section>;
}
export function PanelKpi({ label, value, detail }: { label: string; value: string; detail: string }) {
 return <div className={[styles.card, styles.kpi].join(" ")}><dt>{label}</dt><dd>{value}</dd><span>{detail}</span></div>;
}
