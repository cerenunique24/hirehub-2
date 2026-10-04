"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { friendlyRpcError } from "@/lib/utils/rpcError";
import { REPORT_REASON_LABEL, REPORT_STATUS_LABEL, REPORT_TARGET_LABEL } from "@/lib/marketplace/labels";
import Badge from "../components/Badge";

export type AdminReport = {
  id: string;
  reporterName: string;
  reportedName: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
};

const STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "neutral"> = {
  new: "warning",
  reviewing: "info",
  actioned: "success",
  dismissed: "neutral",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReportsManager({ reports: initial }: { reports: AdminReport[] }) {
  const supabase = createClient();
  const [reports, setReports] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function update(report: AdminReport, status: "reviewing" | "actioned" | "dismissed") {
    setBusy(`${report.id}-${status}`);
    setMessage(null);

    const { error } = await supabase.rpc("admin_update_report", {
      p_report_id: report.id,
      p_status: status,
      p_note: notes[report.id] ?? null,
    });

    setBusy(null);

    if (error) {
      setMessage({ tone: "error", text: friendlyRpcError(error, "Şikayet güncellenemedi.") });
      return;
    }

    setReports((current) =>
      current.map((r) =>
        r.id === report.id ? { ...r, status, adminNote: (notes[report.id] ?? "").trim() || r.adminNote } : r
      )
    );
    setMessage({ tone: "success", text: "Şikayet güncellendi." });
  }

  return (
    <div className="space-y-3">
      {message && (
        <div
          className={`border p-3 text-sm ${
            message.tone === "success"
              ? "border-[#bbf7d0] bg-[#F0FDF4] text-[#166534]"
              : "border-[#fecaca] bg-[#FEF2F2] text-[#991b1b]"
          }`}
        >
          {message.text}
        </div>
      )}

      {reports.map((report) => (
        <div key={report.id} className="space-y-3 border border-[#e5e7eb] bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-[#111111]">
                {REPORT_TARGET_LABEL[report.targetType] ?? report.targetType} şikayeti ·{" "}
                {REPORT_REASON_LABEL[report.reason] ?? report.reason}
              </p>
              <p className="mt-0.5 text-xs text-[#6b7280]">
                Şikayet eden: {report.reporterName} · Şikayet edilen: {report.reportedName} ·{" "}
                {formatDateTime(report.createdAt)}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[report.status] ?? "neutral"}>
              {REPORT_STATUS_LABEL[report.status] ?? report.status}
            </Badge>
          </div>

          {report.details && <p className="whitespace-pre-wrap text-[#374151]">{report.details}</p>}
          {report.adminNote && <p className="text-xs text-[#6b7280]">Yönetici notu: {report.adminNote}</p>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={notes[report.id] ?? ""}
              onChange={(e) => setNotes((c) => ({ ...c, [report.id]: e.target.value }))}
              placeholder="Yönetici notu (opsiyonel)"
              className="h-10 flex-1 border border-[#e5e7eb] px-3 text-sm"
            />
            {(["reviewing", "actioned", "dismissed"] as const).map((status) => (
              <button
                key={status}
                type="button"
                disabled={busy !== null || report.status === status}
                onClick={() => void update(report, status)}
                className="inline-flex h-10 items-center gap-2 border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#111111] hover:bg-[#F7F7F8] disabled:opacity-50"
              >
                {busy === `${report.id}-${status}` && <Loader2 size={14} className="animate-spin" />}
                {status === "reviewing" ? "İncele" : status === "actioned" ? "İşlem Yapıldı" : "Reddet"}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
