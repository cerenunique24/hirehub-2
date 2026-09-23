"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AvailabilityStatus = "available" | "limited" | "unavailable";

const STATUS_LABEL: Record<AvailabilityStatus, string> = {
  available: "Müsait",
  limited: "Kısmen Müsait",
  unavailable: "Müsait Değil",
};

const STATUS_DOT: Record<AvailabilityStatus, string> = {
  available: "🟢",
  limited: "🟡",
  unavailable: "🔴",
};

function normalizeStatus(value: string | null | undefined): AvailabilityStatus {
  return value === "limited" || value === "unavailable" ? value : "available";
}

/**
 * Freelancer Dashboard'daki müsaitlik kartı.
 *
 * Sistem availability_status'u OTOMATİK değiştirmez — bu değeri
 * yalnızca freelancer kendisi değiştirebilir. Aktif proje sayısı ayrı
 * bir sinyaldir, workload göstergesidir, availability'yi ezmez.
 */
export default function AvailabilityCard({
  status,
  activeProjectCount,
  onStatusChange,
}: {
  status: string | null;
  activeProjectCount: number;
  onStatusChange?: (status: AvailabilityStatus) => void;
}) {
  const supabase = createClient();
  const [current, setCurrent] = useState<AvailabilityStatus>(normalizeStatus(status));
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  async function handleSelect(next: AvailabilityStatus) {
    if (next === current) {
      setEditing(false);
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        availability_status: next,
        availability_updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);

    if (!error) {
      setCurrent(next);
      setEditing(false);
      onStatusChange?.(next);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Müsaitlik</h2>
          <p className="mt-1 text-sm text-gray-500">Durumunu istediğin zaman değiştirebilirsin.</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div>
          <p className="text-sm text-gray-500">Müsaitlik</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {STATUS_DOT[current]} {STATUS_LABEL[current]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Aktif projeler</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{activeProjectCount}</p>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 space-y-2">
          {(Object.keys(STATUS_LABEL) as AvailabilityStatus[]).map((option) => (
            <button
              key={option}
              type="button"
              disabled={saving}
              onClick={() => handleSelect(option)}
              className={
                "w-full rounded-xl border p-3 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 " +
                (option === current
                  ? "border-[var(--color-primary-600)] bg-gray-50 text-gray-900"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-400")
              }
            >
              {STATUS_DOT[option]} {STATUS_LABEL[option]}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-900 transition hover:border-[var(--color-primary-600)]"
        >
          Durumu Değiştir
        </button>
      )}
    </div>
  );
}
