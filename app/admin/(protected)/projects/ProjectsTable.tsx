"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, FolderKanban } from "lucide-react";

import { formatCurrency } from "@/lib/utils/formatCurrency";
import EmptyState from "../components/EmptyState";
import Badge from "../components/Badge";
import type { AdminProjectListItem } from "./data";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusVariant(status: string | null): "info" | "success" | "neutral" | "warning" {
  if (status === "in_progress") return "info";
  if (status === "completed") return "success";
  if (status === "open") return "warning";
  return "neutral";
}

export default function ProjectsTable({ projects }: { projects: AdminProjectListItem[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const statuses = useMemo(
    () => [...new Set(projects.map((p) => p.status).filter((s): s is string => Boolean(s)))],
    [projects]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((p) => {
      const matchesSearch =
        query.length === 0 ||
        p.title.toLowerCase().includes(query) ||
        p.clientName.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

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
              placeholder="Proje veya client ara"
              className="h-10 w-full border border-[#e5e7eb] bg-white pl-9 pr-3 text-sm text-[#111111] outline-none focus:border-[#2563EB]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 border border-[#e5e7eb] bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#2563EB]"
          >
            <option value="all">Tüm durumlar</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="shrink-0 text-sm text-[#6b7280]">
          Toplam <span className="font-semibold text-[#111111]">{projects.length}</span> proje
          {filtered.length !== projects.length && <span> · {filtered.length} sonuç gösteriliyor</span>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-[#e5e7eb] bg-white">
          <EmptyState
            icon={FolderKanban}
            title="Henüz kayıt bulunmuyor."
            description="Arama veya filtre kriterlerine uyan bir proje yok."
          />
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#e5e7eb] bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-xs uppercase tracking-wide text-[#9ca3af]">
                <th className="px-4 py-3 font-medium">Proje Adı</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Bütçe</th>
                <th className="px-4 py-3 font-medium">Oluşturulma Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project.id} className="border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#F7F7F8]">
                  <td className="px-4 py-3 font-medium text-[#111111]">{project.title}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${project.clientId}`} className="text-[#4B5563] hover:text-[#2563EB]">
                      {project.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(project.status)}>{project.status ?? "—"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#4B5563]">{project.budget ? formatCurrency(project.budget) : "—"}</td>
                  <td className="px-4 py-3 text-[#4B5563]">{formatDate(project.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
