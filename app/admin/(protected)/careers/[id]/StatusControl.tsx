"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { CAREER_APPLICATION_STATUS_LABEL, type CareerApplicationStatus } from "@/lib/careers";
import Badge from "../../components/Badge";

function statusVariant(status: CareerApplicationStatus): "warning" | "info" | "success" | "neutral" | "danger" {
  if (status === "new") return "warning";
  if (status === "reviewing" || status === "contacted") return "info";
  if (status === "hired") return "success";
  if (status === "rejected") return "danger";
  return "neutral";
}

export default function StatusControl({
  applicationId,
  initialStatus,
}: {
  applicationId: string;
  initialStatus: CareerApplicationStatus;
}) {
  const supabase = createClient();

  const [status, setStatus] = useState<CareerApplicationStatus>(initialStatus);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(nextStatus: CareerApplicationStatus) {
    const previous = status;
    setStatus(nextStatus);
    setUpdating(true);
    setError("");

    const { error: updateError } = await supabase
      .from("career_applications")
      .update({ status: nextStatus })
      .eq("id", applicationId);

    if (updateError) {
      console.error("[CollaCrew Admin] Başvuru durumu güncellenemedi:", updateError);
      setStatus(previous);
      setError("Durum güncellenemedi. Lütfen tekrar dene.");
    }

    setUpdating(false);
  }

  return (
    <div className="flex items-center gap-3">
      <Badge variant={statusVariant(status)}>{CAREER_APPLICATION_STATUS_LABEL[status]}</Badge>

      <select
        value={status}
        disabled={updating}
        onChange={(e) => void handleChange(e.target.value as CareerApplicationStatus)}
        className="h-9 border border-[#e5e7eb] bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#2563EB] disabled:opacity-60"
      >
        {Object.entries(CAREER_APPLICATION_STATUS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {error && <span className="text-xs text-[#DC2626]">{error}</span>}
    </div>
  );
}
