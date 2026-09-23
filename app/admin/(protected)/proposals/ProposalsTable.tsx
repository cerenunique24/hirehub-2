"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, FileText } from "lucide-react";

import { formatCurrency } from "@/lib/utils/formatCurrency";
import EmptyState from "../components/EmptyState";
import Badge from "../components/Badge";
import type { AdminProposalListItem } from "./data";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusVariant(status: string): "success" | "danger" | "warning" | "neutral" {
  if (status === "accepted") return "success";
  if (status === "rejected") return "danger";
  if (status === "pending") return "warning";
  return "neutral";
}

export default function ProposalsTable({ proposals }: { proposals: AdminProposalListItem[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const statuses = useMemo(() => [...new Set(proposals.map((p) => p.status))], [proposals]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return proposals.filter((p) => {
      const matchesSearch =
        query.length === 0 ||
        p.freelancerName.toLowerCase().includes(query) ||
        p.projectTitle.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [proposals, search, statusFilter]);

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
              placeholder="Freelancer veya proje ara"
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
          Toplam <span className="font-semibold text-[#111111]">{proposals.length}</span> teklif
          {filtered.length !== proposals.length && <span> · {filtered.length} sonuç gösteriliyor</span>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-[#e5e7eb] bg-white">
          <EmptyState
            icon={FileText}
            title="Henüz kayıt bulunmuyor."
            description="Arama veya filtre kriterlerine uyan bir teklif yok."
          />
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#e5e7eb] bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-xs uppercase tracking-wide text-[#9ca3af]">
                <th className="px-4 py-3 font-medium">Freelancer</th>
                <th className="px-4 py-3 font-medium">Proje</th>
                <th className="px-4 py-3 font-medium">Teklif Tutarı</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((proposal) => (
                <tr key={proposal.id} className="border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#F7F7F8]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${proposal.freelancerId}`}
                      className="font-medium text-[#111111] hover:text-[#2563EB]"
                    >
                      {proposal.freelancerName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#4B5563]">{proposal.projectTitle}</td>
                  <td className="px-4 py-3 text-[#4B5563]">{formatCurrency(proposal.bidAmount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(proposal.status)}>{proposal.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#4B5563]">{formatDate(proposal.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
