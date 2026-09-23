import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import Badge from "../../components/Badge";
import { getAdminSupportTicketDetail, getAdminSupportTicketMessages } from "../data";
import TicketConversation from "./TicketConversation";

function formatDate(value: string): string {
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminSupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const ticket = await getAdminSupportTicketDetail(supabase, id);

  if (!ticket) {
    notFound();
  }

  const { items: messages, error: messagesError } = await getAdminSupportTicketMessages(
    supabase,
    ticket.id,
    ticket.requesterId
  );

  return (
    <div className="space-y-6">
      <Link
        href="/admin/support"
        className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] transition hover:text-[#2563EB]"
      >
        <ChevronLeft size={16} />
        Destek taleplerine dön
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-[320px] lg:shrink-0">
          <section className="border border-[#e5e7eb] bg-white">
            <div className="border-b border-[#e5e7eb] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#111111]">Talep Bilgisi</h2>
            </div>

            <div className="space-y-3 px-5 py-4 text-sm">
              <div>
                <p className="text-xs text-[#9ca3af]">Konu</p>
                <p className="font-medium text-[#111111]">{ticket.subject}</p>
              </div>

              <div>
                <p className="text-xs text-[#9ca3af]">Kullanıcı</p>
                <Link href={`/admin/users/${ticket.requesterId}`} className="font-medium text-[#111111] hover:text-[#2563EB]">
                  {ticket.requesterName}
                </Link>
                {ticket.requesterEmail && <p className="text-xs text-[#9ca3af]">{ticket.requesterEmail}</p>}
              </div>

              {ticket.category && (
                <div>
                  <p className="text-xs text-[#9ca3af]">Kategori</p>
                  <p className="text-[#374151]">{ticket.category}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-[#9ca3af]">Öncelik</p>
                <Badge>{ticket.priority}</Badge>
              </div>

              {ticket.relatedProjectTitle && (
                <div>
                  <p className="text-xs text-[#9ca3af]">İlgili Proje</p>
                  <Link href={`/admin/projects`} className="text-[#374151] hover:text-[#2563EB]">
                    {ticket.relatedProjectTitle}
                  </Link>
                </div>
              )}

              <div>
                <p className="text-xs text-[#9ca3af]">Oluşturulma tarihi</p>
                <p className="text-[#374151]">{formatDate(ticket.createdAt)}</p>
              </div>

              <div className="border-t border-[#f0f0f0] pt-3">
                <p className="mb-1.5 text-xs text-[#9ca3af]">Açıklama</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-[#374151]">{ticket.description}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="min-w-0 flex-1">
          <TicketConversation
            ticketId={ticket.id}
            initialStatus={ticket.status}
            initialMessages={messages}
            messagesLoadError={messagesError}
            requesterId={ticket.requesterId}
            requesterRole={ticket.requesterRole}
          />
        </div>
      </div>
    </div>
  );
}
