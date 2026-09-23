"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users as UsersIcon } from "lucide-react";

import EmptyState from "../components/EmptyState";
import { profileStatus, type AdminUserListItem, type ProfileStatusTone } from "./data";

type RoleFilter = "all" | "freelancer" | "client";
type StatusFilter = "all" | ProfileStatusTone;

const STATUS_BADGE_CLASS: Record<ProfileStatusTone, string> = {
  complete: "bg-[#F0FDF4] text-[#16A34A]",
  partial: "bg-[#FFFBEB] text-[#B45309]",
  incomplete: "bg-[#F3F4F6] text-[#4B5563]",
};

const ROLE_LABEL: Record<"freelancer" | "client", string> = {
  freelancer: "Freelancer",
  client: "Client",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function UsersTable({ users }: { users: AdminUserListItem[] }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        query.length === 0 ||
        user.fullName.toLowerCase().includes(query) ||
        (user.email ?? "").toLowerCase().includes(query);

      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" || profileStatus(user.profileCompletion).tone === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

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
              placeholder="İsim veya e-posta ara"
              className="h-10 w-full border border-[#e5e7eb] bg-white pl-9 pr-3 text-sm text-[#111111] outline-none focus:border-[#2563EB]"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="h-10 border border-[#e5e7eb] bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#2563EB]"
          >
            <option value="all">Tümü</option>
            <option value="freelancer">Freelancer</option>
            <option value="client">Client</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-10 border border-[#e5e7eb] bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#2563EB]"
          >
            <option value="all">Tüm durumlar</option>
            <option value="complete">Tamamlandı</option>
            <option value="partial">Kısmi</option>
            <option value="incomplete">Eksik</option>
          </select>
        </div>

        <div className="shrink-0 text-sm text-[#6b7280]">
          Toplam <span className="font-semibold text-[#111111]">{users.length}</span> kullanıcı
          {filtered.length !== users.length && (
            <span> · {filtered.length} sonuç gösteriliyor</span>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-[#e5e7eb] bg-white">
          <EmptyState
            icon={UsersIcon}
            title="Henüz kayıt bulunmuyor."
            description="Arama veya filtre kriterlerine uyan bir kullanıcı yok."
          />
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#e5e7eb] bg-white">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-xs uppercase tracking-wide text-[#9ca3af]">
                <th className="px-4 py-3 font-medium">Ad Soyad</th>
                <th className="px-4 py-3 font-medium">E-posta</th>
                <th className="px-4 py-3 font-medium">Tip</th>
                <th className="px-4 py-3 font-medium">Profil Durumu</th>
                <th className="px-4 py-3 font-medium">Kayıt Tarihi</th>
                <th className="px-4 py-3 font-medium text-right">Detay</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const status = profileStatus(user.profileCompletion);

                return (
                  <tr key={user.id} className="border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#F7F7F8]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${user.id}`} className="font-medium text-[#111111] hover:text-[#2563EB]">
                        {user.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#4B5563]">{user.email ?? "—"}</td>
                    <td className="px-4 py-3 text-[#4B5563]">
                      {user.role ? ROLE_LABEL[user.role] : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[status.tone]}`}>
                        {status.label} · %{user.profileCompletion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#4B5563]">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="border border-[#e5e7eb] px-3 py-1.5 text-xs font-medium text-[#111111] transition hover:border-[#2563EB] hover:text-[#2563EB]"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
