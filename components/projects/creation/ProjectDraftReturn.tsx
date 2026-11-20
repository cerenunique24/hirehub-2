"use client";
import {useSyncExternalStore} from "react";
import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {PROJECT_DRAFT_RETURN_KEY} from "@/lib/projects/creationDraft";
/** Return context stays in the current tab, throughout plan selection and checkout. */
export function ProjectDraftReturn() {
  const available = useSyncExternalStore(
    () => () => {},
    () => { try { return Boolean(sessionStorage.getItem(PROJECT_DRAFT_RETURN_KEY)); } catch { return false; } },
    () => false,
  );
  return available ? <Link href="/client/projects/new?resume=1" className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-primary-600)]"><ArrowLeft size={16}/>Projeye dön</Link> : null;
}
