"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, UserRound } from "lucide-react";
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
  user_id: string;
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

type Message = {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

const statuses = [
  ["open", "Açık"],
  ["in_progress", "İnceleniyor"],
  ["waiting_user", "Kullanıcıdan Yanıt Bekleniyor"],
  ["resolved", "Çözüldü"],
  ["closed", "Kapalı"],
] as const;

export default function AdminSupportTicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);

  const load = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    setAdminId(user.id);

    const [{ data: ticketData, error: ticketError }, { data: messageData, error: messageError }] =
      await Promise.all([
        supabase
          .from("support_tickets")
          .select("id,subject,category,description,priority,status,created_at,updated_at,user_id,profiles(first_name,last_name,email,role)")
          .eq("id", id)
          .single(),
        supabase
          .from("support_ticket_messages")
          .select("id,ticket_id,sender_id,message,created_at")
          .eq("ticket_id", id)
          .order("created_at", { ascending: true }),
      ]);

    if (ticketError) {
      console.error("TICKET LOAD ERROR:", ticketError);
      return;
    }

    if (messageError) {
      console.error("MESSAGE LOAD ERROR:", messageError);
    }

    setTicket(ticketData as Ticket);
    setMessages((messageData as Message[]) ?? []);
  };

  useEffect(() => {
    load();
  }, [id]);

  const updateStatus = async (nextStatus: Ticket["status"]) => {
    if (!ticket) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", ticket.id);

    if (error) {
      console.error("STATUS UPDATE ERROR:", error);
      return;
    }

    setTicket({ ...ticket, status: nextStatus });
  };

  const sendReply = async () => {
    const message = reply.trim();
    if (!message || !adminId || !ticket || saving) return;

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticket.id,
        sender_id: adminId,
        message,
      });

    if (error) {
      console.error("REPLY ERROR:", error);
      setSaving(false);
      return;
    }

    await supabase
      .from("support_tickets")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", ticket.id);

    setReply("");
    setTicket({ ...ticket, status: "in_progress" });
    setSaving(false);
    await load();
  };

  if (!ticket) {
    return <div className="py-20 text-center text-sm text-neutral-500">Talep yükleniyor...</div>;
  }

  const requester = ticket.profiles?.[0] ?? null;
  const userName =
    [requester?.first_name, requester?.last_name].filter(Boolean).join(" ") ||
    "Kullanıcı";

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Link href="/admin/support" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft size={16} />
        Destek Taleplerine Dön
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <section className="border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-neutral-400">#{ticket.id.slice(0, 8)}</p>
                <h1 className="mt-1 text-2xl font-bold">{ticket.subject}</h1>
                <p className="mt-2 text-xs text-neutral-500">
                  {new Date(ticket.created_at).toLocaleString("tr-TR")}
                </p>
              </div>
              <select
                value={ticket.status}
                onChange={(e) => updateStatus(e.target.value as Ticket["status"])}
                className="border border-neutral-200 bg-white px-3 py-2 text-sm outline-none"
              >
                {statuses.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div className="bg-neutral-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-neutral-500">{requester?.email}</p>
                </div>
              </div>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                {ticket.description}
              </p>
            </div>

            {messages.map((item) => {
              const mine = item.sender_id === adminId;
              return (
                <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] px-4 py-3 ${
                    mine ? "bg-black text-white" : "bg-neutral-100 text-neutral-800"
                  }`}>
                    <p className="whitespace-pre-wrap text-sm leading-6">{item.message}</p>
                    <p className={`mt-2 text-[10px] ${
                      mine ? "text-neutral-400" : "text-neutral-400"
                    }`}>
                      {new Date(item.created_at).toLocaleString("tr-TR")}
                    </p>
                  </div>
                </div>
              );
            })}

            <div className="border-t border-neutral-200 pt-5">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Kullanıcıya yanıtını yaz..."
                rows={5}
                className="w-full resize-none border border-neutral-200 p-4 text-sm outline-none focus:border-neutral-500"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={sendReply}
                  disabled={!reply.trim() || saving}
                  className="inline-flex items-center gap-2 bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={15} />
                  {saving ? "Gönderiliyor..." : "Yanıtla"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="h-fit border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <UserRound size={17} />
            <h2 className="font-semibold">Kullanıcı</h2>
          </div>

          <div className="mt-5 space-y-4 text-sm">
            <div>
              <p className="text-xs text-neutral-400">Ad Soyad</p>
              <p className="mt-1 font-medium">{userName}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">E-posta</p>
              <p className="mt-1 break-all">{requester?.email || "Belirtilmemiş"}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Hesap tipi</p>
              <p className="mt-1 capitalize">{requester?.role || "Kullanıcı"}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Kategori</p>
              <p className="mt-1">{ticket.category || "Genel destek"}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Öncelik</p>
              <p className="mt-1 capitalize">{ticket.priority === "high" ? "Yüksek" : ticket.priority === "low" ? "Düşük" : "Normal"}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
