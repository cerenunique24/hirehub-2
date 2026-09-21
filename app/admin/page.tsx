"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FolderKanban,
  LifeBuoy,
  CreditCard,
  ArrowUpRight,
  Clock3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  profiles?: { first_name: string | null; last_name: string | null } | null;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ users: 0, projects: 0, tickets: 0, payments: 0 });
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      const [users, projects, ticketsCount, payments, recent] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("payments").select("id", { count: "exact", head: true }),
        supabase
          .from("support_tickets")
          .select("id,subject,status,priority,created_at,profiles(first_name,last_name)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setStats({
        users: users.count ?? 0,
        projects: projects.count ?? 0,
        tickets: ticketsCount.count ?? 0,
        payments: payments.count ?? 0,
      });

      setTickets((recent.data as Ticket[]) ?? []);
    };

    load();
  }, []);

  const cards = [
    { label: "Toplam Kullanıcı", value: stats.users, icon: Users },
    { label: "Toplam Proje", value: stats.projects, icon: FolderKanban },
    { label: "Açık Destek", value: stats.tickets, icon: LifeBuoy },
    { label: "Ödeme İşlemleri", value: stats.payments, icon: CreditCard },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-neutral-500">
          CollaCrew operasyonlarını tek yerden takip et.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                  <Icon size={19} />
                </div>
                <ArrowUpRight size={16} className="text-neutral-400" />
              </div>
              <p className="mt-6 text-sm text-neutral-500">{card.label}</p>
              <p className="mt-1 text-3xl font-semibold">{card.value.toLocaleString("tr-TR")}</p>
            </div>
          );
        })}
      </div>

      <section className="border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
          <div>
            <h2 className="font-semibold">Son Destek Talepleri</h2>
            <p className="mt-1 text-xs text-neutral-500">Yanıt bekleyen kullanıcı talepleri</p>
          </div>
          <Link href="/admin/support" className="text-sm font-medium text-neutral-900 hover:underline">
            Tümünü Gör
          </Link>
        </div>

        {tickets.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-neutral-500">
            Henüz destek talebi bulunmuyor.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {tickets.map((ticket) => {
              const name = [ticket.profiles?.first_name, ticket.profiles?.last_name]
                .filter(Boolean)
                .join(" ") || "Kullanıcı";

              return (
                <Link
                  key={ticket.id}
                  href={`/admin/support/${ticket.id}`}
                  className="flex items-center justify-between px-6 py-4 transition hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="truncate font-medium">{ticket.subject}</span>
                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] text-neutral-600">
                        {ticket.status === "open" ? "Açık" : ticket.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">{name}</p>
                  </div>
                  <Clock3 size={16} className="shrink-0 text-neutral-400" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
