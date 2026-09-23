"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Paperclip, Search } from "lucide-react";

import EmptyState from "../components/EmptyState";
import Badge from "../components/Badge";
import { CAREER_APPLICATION_STATUS_LABEL, type CareerApplicationStatus } from "@/lib/careers";
import type { AdminCareerApplicationListItem } from "./data";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusVariant(status: CareerApplicationStatus): "warning" | "info" | "success" | "neutral" | "danger" {
  if (status === "new") return "warning";
  if (status === "reviewing" || status === "contacted") return "info";
  if (status === "hired") return "success";
  if (status === "rejected") return "danger";
  return "neutral";
}

export default function CareersTable({ applications }: { applications: AdminCareerApplicationListItem[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CareerApplicationStatus>("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesSearch =
        query.length === 0 ||
        application.fullName.toLowerCase().includes(query) ||
        application.email.toLowerCase().includes(query) ||
        application.expertise.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || application.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border border-[#e5e7eb] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim, e-posta veya uzmanlık ara"
              className="h-10 w-full border border-[#e5e7eb] bg-white pl-9 pr-3 text-sm text-[#111111] outline-none focus:border-[#2563EB]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | CareerApplicationStatus)}
            className="h-10 border border-[#e5e7eb] bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#2563EB]"
          >
            <option value="all">Tüm durumlar</option>
            {Object.entries(CAREER_APPLICATION_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="shrink-0 text-sm text-[#6b7280]">
          Toplam <span className="font-semibold text-[#111111]">{applications.length}</span> başvuru
          {filtered.length !== applications.length && <span> · {filtered.length} sonuç gösteriliyor</span>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-[#e5e7eb] bg-white">
          <EmptyState
            icon={Briefcase}
            title="Henüz kayıt bulunmuyor."
            description="Arama veya filtre kriterlerine uyan bir kariyer başvurusu yok."
          />
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#e5e7eb] bg-white">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-xs uppercase tracking-wide text-[#9ca3af]">
                <th className="px-4 py-3 font-medium">Ad Soyad</th>
                <th className="px-4 py-3 font-medium">Uzmanlık</th>
                <th className="px-4 py-3 font-medium">Dosya</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((application) => (
                <tr key={application.id} className="border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#F7F7F8]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/careers/${application.id}`}
                      className="font-medium text-[#111111] hover:text-[#2563EB]"
                    >
                      {application.fullName}
                    </Link>
                    <p className="text-xs text-[#9ca3af]">{application.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[#4B5563]">{application.expertise}</td>
                  <td className="px-4 py-3 text-[#4B5563]">
                    {application.fileCount > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Paperclip size={13} />
                        {application.fileCount}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(application.status)}>
                      {CAREER_APPLICATION_STATUS_LABEL[application.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[#4B5563]">{formatDate(application.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
