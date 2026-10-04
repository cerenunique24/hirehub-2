"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AvailabilityStatus = "available" | "limited" | "unavailable";

const STATUS_LABEL: Record<AvailabilityStatus, string> = {
  available: "Müsait",
  limited: "Sınırlı müsaitlik",
  unavailable: "Müsait değil",
};

const STATUS_DOT_CLASS: Record<AvailabilityStatus, string> = {
  available: "bg-[var(--color-success-600)]",
  limited: "bg-[var(--color-warning-600)]",
  unavailable: "bg-gray-400",
};

const STATUS_SURFACE_CLASS: Record<AvailabilityStatus, string> = {
  available: "border-[var(--color-success-600)]/20 bg-[var(--color-success-50)]/40",
  limited: "border-[var(--color-warning-600)]/20 bg-[var(--color-warning-50)]/40",
  unavailable: "border-gray-200 bg-gray-50",
};

function normalizeStatus(value: string | null | undefined): AvailabilityStatus {
  return value === "limited" || value === "unavailable" ? value : "available";
}

function formatDate(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(date);
}

function formatRelativeUpdate(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/**
 * Freelancer Dashboard/Profil'deki müsaitlik kartı.
 *
 * Sistem availability_status'u OTOMATİK değiştirmez — bu değeri
 * yalnızca freelancer kendisi değiştirebilir. Aktif proje sayısı ayrı
 * bir sinyaldir, workload göstergesidir, availability'yi ezmez.
 */
export default function AvailabilityCard({
  status,
  activeProjectCount,
  availableFrom = null,
  availabilityNote = null,
  availabilityUpdatedAt = null,
  onStatusChange,
}: {
  status: string | null;
  activeProjectCount: number;
  availableFrom?: string | null;
  availabilityNote?: string | null;
  availabilityUpdatedAt?: string | null;
  onStatusChange?: (status: AvailabilityStatus) => void;
}) {
  const supabase = createClient();
  const [current, setCurrent] = useState<AvailabilityStatus>(normalizeStatus(status));
  const [note, setNote] = useState(availabilityNote ?? "");
  const [fromDate, setFromDate] = useState(availableFrom ?? "");
  const [updatedAt, setUpdatedAt] = useState(availabilityUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftStatus, setDraftStatus] = useState<AvailabilityStatus>(current);
  const [draftNote, setDraftNote] = useState(note);
  const [draftFromDate, setDraftFromDate] = useState(fromDate);

  function startEditing() {
    setDraftStatus(current);
    setDraftNote(note);
    setDraftFromDate(fromDate);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({
        availability_status: draftStatus,
        availability_note: draftNote.trim() || null,
        available_from: draftFromDate || null,
        availability_updated_at: nowIso,
      })
      .eq("id", user.id);

    setSaving(false);

    if (!error) {
      setCurrent(draftStatus);
      setNote(draftNote.trim());
      setFromDate(draftFromDate);
      setUpdatedAt(nowIso);
      setEditing(false);
      onStatusChange?.(draftStatus);
    }
  }

  const displayFromDate = formatDate(fromDate);
  const lastUpdated = formatRelativeUpdate(updatedAt);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Müsaitlik</h2>
          <p className="mt-1 text-sm text-gray-500">Durumunu istediğin zaman değiştirebilirsin.</p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500">Aktif proje</p>
          <p className="mt-0.5 text-base font-semibold text-gray-900">{activeProjectCount}</p>
        </div>
      </div>

      {/* Kompakt durum kartı */}
      <div className={`mt-4 rounded-xl border p-4 ${STATUS_SURFACE_CLASS[current]}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[current]}`} />
          <p className="text-sm font-semibold text-gray-900">{STATUS_LABEL[current]}</p>
        </div>

        {note && <p className="mt-1.5 text-sm text-gray-600">{note}</p>}

        {current !== "available" && displayFromDate && (
          <p className="mt-1 text-xs text-gray-500">{displayFromDate} itibarıyla değişebilir</p>
        )}

        {current === "available" && displayFromDate && (
          <p className="mt-1 text-xs text-gray-500">{displayFromDate} itibarıyla başlayabilir</p>
        )}

        {lastUpdated && (
          <p className="mt-2 text-[11px] text-gray-400">Son güncelleme: {lastUpdated}</p>
        )}
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            {(Object.keys(STATUS_LABEL) as AvailabilityStatus[]).map((option) => (
              <button
                key={option}
                type="button"
                disabled={saving}
                onClick={() => setDraftStatus(option)}
                className={
                  "flex w-full items-center gap-2 rounded-xl border p-3 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 " +
                  (option === draftStatus
                    ? "border-[var(--color-primary-600)] bg-[var(--color-primary-50)] text-[var(--color-text-primary)]"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-400")
                }
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[option]}`} />
                {STATUS_LABEL[option]}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Kısa not (opsiyonel)</label>
            <input
              type="text"
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value.slice(0, 120))}
              placeholder="Örn. Yeni projelere açığım"
              disabled={saving}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[var(--color-primary-600)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">
              {draftStatus === "available" ? "Ne zamandan itibaren müsaitsin? (opsiyonel)" : "Ne zaman değişebilir? (opsiyonel)"}
            </label>
            <input
              type="date"
              value={draftFromDate}
              onChange={(event) => setDraftFromDate(event.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[var(--color-primary-600)]"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="flex-1 rounded-lg bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-400"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-900 transition hover:border-[var(--color-primary-600)]"
        >
          Durumu Değiştir
        </button>
      )}
    </div>
  );
}
