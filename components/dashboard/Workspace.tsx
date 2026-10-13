import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import type { ReactNode } from "react";
import type { projectWork } from "@/lib/projects/dashboard";
import { formatDeadlineDate, formatRemainingTime } from "@/lib/utils/deadline";

export const dashboardLink = "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600";

export function WorkspaceHeader({ title, description, href, action, create = false }: { title: string; description: string; href: string; action: string; create?: boolean }) {
  return <header className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="mb-1 text-xs font-medium uppercase tracking-widest text-neutral-500">Çalışma merkezi</p><h1 className="text-2xl font-semibold tracking-tight text-[#111]">{title}</h1><p className="mt-2 text-sm text-neutral-500">{description}</p></div><Link href={href} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">{create && <Plus size={16} />}{action}</Link></header>;
}

export function WorkspaceSection({ title, description, href, children }: { title: string; description?: string; href?: string; children: ReactNode }) {
  return <section className="mb-7"><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-[#111]">{title}</h2>{description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}</div>{href && <Link href={href} className={dashboardLink}>Tümünü gör <ArrowRight size={14} /></Link>}</div>{children}</section>;
}

export function ActionRow({ title, detail, reason, href, cta, deadline }: { title: string; detail?: string; reason: string; href: string; cta: string; deadline?: string | null }) {
  return <div className="flex flex-col justify-between gap-3 border-b border-neutral-200 py-4 last:border-0 sm:flex-row sm:items-center"><div className="min-w-0"><p className="text-sm font-semibold text-[#111]">{title}</p>{detail && <p className="mt-1 text-xs text-neutral-500">{detail}</p>}<p className="mt-1 text-sm text-neutral-600">{reason}</p>{deadline && <Deadline value={deadline} />}</div><Link href={href} className={dashboardLink}>{cta}<ArrowRight size={14} /></Link></div>;
}

export function Deadline({ value }: { value: string | null }) {
  const remaining = formatRemainingTime(value);
  return <p className={`mt-1 text-xs ${remaining.overdue ? "text-red-600" : "text-neutral-500"}`}>{formatDeadlineDate(value) ?? "Son tarih belirtilmemiş"}{value && ` · ${remaining.label}`}</p>;
}

export function ProjectRow({ title, role, money, deadline, work, href, team }: { title: string; role: string; money: string; deadline: string | null; work: ReturnType<typeof projectWork>; href: string; team?: string }) {
  const { workflow, currentMilestone, approvedMilestones, totalMilestones } = work;
  return <article className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><Link href={href} className="text-base font-semibold text-[#111] hover:text-blue-600">{title}</Link><p className="mt-1 text-xs text-neutral-500">{role}</p></div><span className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-600">{workflow.state}</span></div><div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]"><div><p className="text-sm text-[#111]">{currentMilestone?.title ?? workflow.state}</p><p className="mt-1 text-xs text-neutral-500">Aksiyon: {workflow.currentUserMustAct ? "Senden bekleniyor" : workflow.actionOwner === "Client" ? "Müşteriden bekleniyor" : workflow.actionOwner}</p><p className="mt-2 text-sm leading-6 text-neutral-600">{workflow.nextStep}</p></div><div className="sm:text-right"><p className="text-sm font-medium text-[#111]">{money}</p><Deadline value={currentMilestone?.due_date ?? deadline} />{team && <p className="mt-2 text-xs text-neutral-500">{team}</p>}</div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3"><div className="min-w-[140px] flex-1 sm:max-w-[240px]"><p className="text-xs text-neutral-500">{totalMilestones ? `${approvedMilestones} / ${totalMilestones} aşama onaylandı` : "Aşamalar henüz tanımlanmadı"}</p>{totalMilestones > 0 && <progress aria-label="Onaylanan aşamalar" max={totalMilestones} value={approvedMilestones} className="mt-2 block h-1 w-full overflow-hidden rounded-full accent-blue-600" />}</div><Link href={href} className={dashboardLink}>{workflow.currentUserMustAct ? "Devam et" : "Projeye git"}<ArrowRight size={14} /></Link></div></article>;
}

export function DashboardStatus({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <p role="status" className="py-16 text-center text-sm text-neutral-500">Çalışma merkezi yükleniyor…</p>;
  return <div role="alert" className="rounded-lg border border-red-200 p-5 text-sm text-red-700"><p>{error}</p><button onClick={retry} className="mt-3 rounded-lg border border-neutral-200 px-3 py-2 text-neutral-700">Tekrar dene</button></div>;
}
