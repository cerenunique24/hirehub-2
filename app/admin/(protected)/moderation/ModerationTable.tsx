"use client";

import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import EmptyState from "../components/EmptyState";
import Badge from "../components/Badge";
import { updateModerationFlagStatus, type AdminModerationFlag, type ModerationFlagStatus } from "./data";

const STATUS_LABEL: Record<ModerationFlagStatus, string> = {
  new: "Yeni",
  reviewed: "İncelendi",
  actioned: "İşlem Yapıldı",
  closed: "Kapatıldı",
};

const STATUS_VARIANT: Record<ModerationFlagStatus, "warning" | "info" | "success" | "neutral"> = {
  new: "warning",
  reviewed: "info",
  actioned: "success",
  closed: "neutral",
};

const SOURCE_LABEL: Record<string, string> = {
  messages: "Mesaj",
  proposals: "Teklif metni",
  profiles: "Profil (hakkında)",
  projects: "Proje açıklaması",
  project_milestones: "Teslim/revizyon notu",
  support_ticket_messages: "Destek mesajı",
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ModerationTable({ flags: initialFlags }: { flags: AdminModerationFlag[] }) {
  const supabase = createClient();

  const [flags, setFlags] = useState(initialFlags);
  const [statusFilter, setStatusFilter] = useState<"all" | ModerationFlagStatus>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (statusFilter === "all" ? flags : flags.filter((f) => f.status === statusFilter)),
    [flags, statusFilter]
  );

  async function handleStatusChange(id: string, status: ModerationFlagStatus) {
    setUpdatingId(id);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUpdatingId(null);
      return;
    }

    const { error } = await updateModerationFlagStatus(supabase, id, status, user.id);

    if (!error) {
      setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));

      await supabase.rpc("log_audit_event", {
        p_event_type: "moderation_status_changed",
        p_target_table: "moderation_flags",
        p_target_id: id,
        p_metadata: { new_status: status },
      });
    }

    setUpdatingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border border-[#e5e7eb] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-10 border border-[#e5e7eb] bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#2563EB]"
        >
          <option value="all">Tüm durumlar</option>
          <option value="new">Yeni</option>
          <option value="reviewed">İncelendi</option>
          <option value="actioned">İşlem Yapıldı</option>
          <option value="closed">Kapatıldı</option>
        </select>

        <div className="text-sm text-[#6b7280]">
          Toplam <span className="font-semibold text-[#111111]">{flags.length}</span> kayıt
          {filtered.length !== flags.length && <span> · {filtered.length} sonuç gösteriliyor</span>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-[#e5e7eb] bg-white">
          <EmptyState
            icon={ShieldAlert}
            title="Henüz kayıt bulunmuyor."
            description="Platform dışı iletişim/ödeme denemesi tespit edildiğinde burada listelenecek."
          />
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#e5e7eb] bg-white">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-xs uppercase tracking-wide text-[#9ca3af]">
                <th className="px-4 py-3 font-medium">Kullanıcı</th>
                <th className="px-4 py-3 font-medium">Kaynak</th>
                <th className="px-4 py-3 font-medium">Risk Nedeni</th>
                <th className="px-4 py-3 font-medium">İçerik (kısaltılmış)</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((flag) => (
                <tr key={flag.id} className="border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#F7F7F8]">
                  <td className="px-4 py-3 font-medium text-[#111111]">{flag.userName}</td>
                  <td className="px-4 py-3 text-[#4B5563]">
                    {SOURCE_LABEL[flag.sourceTable] ?? flag.sourceTable}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{flag.riskReason ?? "diğer"}</Badge>
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-3 text-[#4B5563]" title={flag.snippet}>
                    {flag.snippet}
                  </td>
                  <td className="px-4 py-3 text-[#4B5563]">{formatDateTime(flag.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANT[flag.status]}>{STATUS_LABEL[flag.status]}</Badge>
                      <select
                        value={flag.status}
                        disabled={updatingId === flag.id}
                        onChange={(e) => void handleStatusChange(flag.id, e.target.value as ModerationFlagStatus)}
                        className="h-8 border border-[#e5e7eb] bg-white px-2 text-xs text-[#111111] outline-none focus:border-[#2563EB] disabled:opacity-60"
                      >
                        <option value="new">Yeni</option>
                        <option value="reviewed">İncelendi</option>
                        <option value="actioned">İşlem Yapıldı</option>
                        <option value="closed">Kapatıldı</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
