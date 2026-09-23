"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LifeBuoy, Search, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Ticket = {
  id: string;
  subject: string;
  category: string | null;
  description: string;
  priority: "low" | "normal" | "high";
  status: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  /**
   * `profiles(...)` embed — Supabase returns the related rows as an array
   * (one entry for the ticket's user). Read it with `ticket.profiles?.[0]`.
   */
  profiles:
    | {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        role: string | null;
      }[]
    | null;
};

const statusLabels: Record<Ticket["status"], string> = {
  open: "Açık",
  in_progress: "İnceleniyor",
  waiting_user: "Kullanıcıdan Yanıt Bekleniyor",
  resolved: "Çözüldü",
  closed: "Kapalı",
};

const priorityLabels = { low: "Düşük", normal: "Normal", high: "Yüksek" };

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState<"all" | Ticket["status"]>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id,subject,category,description,priority,status,created_at,updated_at,profiles(first_name,last_name,email,role)")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("ADMIN SUPPORT ERROR:", error);
        return;
      }

      setTickets((data as Ticket[]) ?? []);
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");

    return tickets.filter((ticket) => {
      const matchesStatus = status === "all" || ticket.status === status;
      const requester = ticket.profiles?.[0] ?? null;
      const name = [requester?.first_name, requester?.last_name].filter(Boolean).join(" ");
      const haystack = [ticket.subject, ticket.description, name, requester?.email]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [tickets, status, search]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Destek Talepleri</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Kullanıcıların gönderdiği talepleri buradan yanıtlayabilirsin.
          </p>
        </div>
        <div className="text-sm text-neutral-500">{filtered.length} talep</div>
      </div>

      <div className="flex flex-col gap-3 border border-neutral-200 bg-white p-4 lg:flex-row">
        <div className="flex flex-1 items-center gap-2 border border-neutral-200 px-3">
          <Search size={17} className="text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Talep, kullanıcı veya e-posta ara..."
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-neutral-400" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="h-11 border border-neutral-200 bg-white px-3 text-sm outline-none"
          >
            <option value="all">Tüm Durumlar</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden border border-neutral-200 bg-white">
        <div className="grid grid-cols-[1fr_180px_140px_130px] border-b border-neutral-200 bg-neutral-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
          <span>Talep</span>
          <span>Kullanıcı</span>
          <span>Durum</span>
          <span>Öncelik</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <LifeBuoy className="mx-auto text-neutral-300" size={28} />
            <p className="mt-3 text-sm text-neutral-500">Aramana uygun destek talebi yok.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filtered.map((ticket) => {
              const requester = ticket.profiles?.[0] ?? null;
              const name = [requester?.first_name, requester?.last_name]
                .filter(Boolean)
                .join(" ") || "Kullanıcı";

              return (
                <Link
                  key={ticket.id}
                  href={`/admin/support/${ticket.id}`}
                  className="grid grid-cols-1 gap-3 px-5 py-5 transition hover:bg-neutral-50 lg:grid-cols-[1fr_180px_140px_130px] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{ticket.subject}</p>
                    <p className="mt-1 truncate text-xs text-neutral-500">
                      {ticket.category || "Genel destek"} · {new Date(ticket.created_at).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm">{name}</p>
                    <p className="mt-1 truncate text-xs text-neutral-500">{requester?.email}</p>
                  </div>
                  <span className="w-fit rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-700">
                    {statusLabels[ticket.status]}
                  </span>
                  <span className={`w-fit rounded-full px-3 py-1.5 text-xs ${
                    ticket.priority === "high"
                      ? "bg-red-50 text-red-600"
                      : ticket.priority === "low"
                      ? "bg-neutral-100 text-neutral-500"
                      : "bg-amber-50 text-amber-700"
                  }`}>
                    {priorityLabels[ticket.priority]}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
