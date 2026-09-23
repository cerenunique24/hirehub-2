import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FolderKanban, FileText, Wallet, LifeBuoy } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/formatCurrency";

import EmptyState from "../../components/EmptyState";
import Badge from "../../components/Badge";
import { getAdminUserActivity, getAdminUserProfile, profileStatus } from "../data";

const ROLE_LABEL: Record<"freelancer" | "client", string> = {
  freelancer: "Freelancer",
  client: "Client",
};

const STATUS_BADGE_CLASS: Record<"complete" | "partial" | "incomplete", string> = {
  complete: "bg-[#F0FDF4] text-[#16A34A]",
  partial: "bg-[#FFFBEB] text-[#B45309]",
  incomplete: "bg-[#F3F4F6] text-[#4B5563]",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#f0f0f0] py-2.5 text-sm last:border-b-0">
      <span className="text-[#9ca3af]">{label}</span>
      <span className="text-right font-medium text-[#111111]">{value}</span>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const profile = await getAdminUserProfile(supabase, id);

  if (!profile) {
    notFound();
  }

  const activity = await getAdminUserActivity(supabase, profile.id, profile.role);
  const status = profileStatus(profile.profileCompletion);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] transition hover:text-[#2563EB]"
      >
        <ChevronLeft size={16} />
        Kullanıcılara dön
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-[340px] lg:shrink-0">
          <section className="border border-[#e5e7eb] bg-white">
            <div className="border-b border-[#e5e7eb] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#111111]">Profil</h2>
            </div>

            <div className="px-5 py-4">
              <div className="mb-4">
                <p className="text-lg font-semibold text-[#111111]">{profile.fullName}</p>
                {profile.title && <p className="text-sm text-[#6b7280]">{profile.title}</p>}
              </div>

              <div>
                <InfoRow label="Kullanıcı ID" value={profile.id} />
                <InfoRow label="E-posta" value={profile.email ?? "—"} />
                <InfoRow label="Rol" value={profile.role ? ROLE_LABEL[profile.role] : "—"} />
                {profile.accountType && <InfoRow label="Hesap tipi" value={profile.accountType} />}
                {profile.companyName && <InfoRow label="Şirket" value={profile.companyName} />}
                <InfoRow label="Kayıt tarihi" value={formatDate(profile.createdAt)} />
                {(profile.city || profile.country) && (
                  <InfoRow
                    label="Konum"
                    value={[profile.city, profile.country].filter(Boolean).join(", ")}
                  />
                )}
                {profile.phone && <InfoRow label="Telefon" value={profile.phone} />}
              </div>

              <div className="mt-4 border-t border-[#f0f0f0] pt-4">
                <p className="mb-1.5 text-xs text-[#9ca3af]">Durum</p>
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[status.tone]}`}>
                  {status.label} · Profil %{profile.profileCompletion}
                </span>
              </div>

              {profile.bio && (
                <div className="mt-4 border-t border-[#f0f0f0] pt-4">
                  <p className="mb-1.5 text-xs text-[#9ca3af]">Hakkında</p>
                  <p className="text-sm leading-6 text-[#374151]">{profile.bio}</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          <section className="border border-[#e5e7eb] bg-white">
            <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-5 py-4">
              <FolderKanban size={16} className="text-[#9ca3af]" />
              <h2 className="text-sm font-semibold text-[#111111]">
                Projeler {activity.projects.length > 0 && `(${activity.projects.length})`}
              </h2>
            </div>

            {activity.projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="Henüz kayıt bulunmuyor."
                description={
                  profile.role === "client"
                    ? "Bu client henüz proje oluşturmamış."
                    : "Bu freelancer henüz aktif bir proje ekibinde değil."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] text-xs uppercase tracking-wide text-[#9ca3af]">
                      <th className="px-5 py-2.5 font-medium">Başlık</th>
                      <th className="px-5 py-2.5 font-medium">Durum</th>
                      <th className="px-5 py-2.5 font-medium">Bütçe</th>
                      <th className="px-5 py-2.5 font-medium">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.projects.map((project) => (
                      <tr key={project.id} className="border-b border-[#f0f0f0] last:border-b-0">
                        <td className="px-5 py-2.5 font-medium text-[#111111]">{project.title}</td>
                        <td className="px-5 py-2.5">
                          <Badge>{project.status ?? "—"}</Badge>
                        </td>
                        <td className="px-5 py-2.5 text-[#4B5563]">
                          {project.budget ? formatCurrency(project.budget) : "—"}
                        </td>
                        <td className="px-5 py-2.5 text-[#4B5563]">{formatDate(project.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="border border-[#e5e7eb] bg-white">
            <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-5 py-4">
              <FileText size={16} className="text-[#9ca3af]" />
              <h2 className="text-sm font-semibold text-[#111111]">
                Teklifler {activity.proposals.length > 0 && `(${activity.proposals.length})`}
              </h2>
            </div>

            {activity.proposals.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Henüz kayıt bulunmuyor."
                description={
                  profile.role === "client"
                    ? "Bu client'ın projelerine henüz teklif gelmemiş."
                    : "Bu freelancer henüz teklif göndermemiş."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] text-xs uppercase tracking-wide text-[#9ca3af]">
                      <th className="px-5 py-2.5 font-medium">Proje</th>
                      <th className="px-5 py-2.5 font-medium">Durum</th>
                      <th className="px-5 py-2.5 font-medium">Teklif tutarı</th>
                      <th className="px-5 py-2.5 font-medium">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.proposals.map((proposal) => (
                      <tr key={proposal.id} className="border-b border-[#f0f0f0] last:border-b-0">
                        <td className="px-5 py-2.5 font-medium text-[#111111]">{proposal.projectTitle}</td>
                        <td className="px-5 py-2.5">
                          <Badge>{proposal.status}</Badge>
                        </td>
                        <td className="px-5 py-2.5 text-[#4B5563]">{formatCurrency(proposal.bidAmount)}</td>
                        <td className="px-5 py-2.5 text-[#4B5563]">{formatDate(proposal.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="border border-[#e5e7eb] bg-white">
            <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-5 py-4">
              <Wallet size={16} className="text-[#9ca3af]" />
              <h2 className="text-sm font-semibold text-[#111111]">Ödemeler</h2>
            </div>

            {!activity.financials ? (
              <EmptyState
                icon={Wallet}
                title="Henüz kayıt bulunmuyor."
                description="Bu kullanıcı için henüz proje/teklif temelli bir finansal özet hesaplanamıyor."
              />
            ) : (
              <div className="grid grid-cols-1 gap-px bg-[#f0f0f0] sm:grid-cols-3">
                <div className="bg-white px-5 py-4">
                  <p className="text-xs text-[#9ca3af]">{activity.financials.totalLabel}</p>
                  <p className="mt-1.5 text-lg font-semibold text-[#111111]">
                    {formatCurrency(activity.financials.total)}
                  </p>
                </div>
                <div className="bg-white px-5 py-4">
                  <p className="text-xs text-[#9ca3af]">{activity.financials.realizedLabel}</p>
                  <p className="mt-1.5 text-lg font-semibold text-[#111111]">
                    {formatCurrency(activity.financials.realized)}
                  </p>
                </div>
                <div className="bg-white px-5 py-4">
                  <p className="text-xs text-[#9ca3af]">{activity.financials.pendingLabel}</p>
                  <p className="mt-1.5 text-lg font-semibold text-[#111111]">
                    {formatCurrency(activity.financials.pending)}
                  </p>
                </div>
              </div>
            )}

            <p className="border-t border-[#f0f0f0] px-5 py-3 text-xs text-[#9ca3af]">
              CollaCrew&apos;da henüz bir ödeme altyapısı yok — bu rakamlar proje/milestone verisinden
              hesaplanan iş değeri özetidir, gerçekleşmiş bir para transferini temsil etmez.
            </p>
          </section>

          <section className="border border-[#e5e7eb] bg-white">
            <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-5 py-4">
              <LifeBuoy size={16} className="text-[#9ca3af]" />
              <h2 className="text-sm font-semibold text-[#111111]">
                Destek Talepleri {activity.supportTickets.length > 0 && `(${activity.supportTickets.length})`}
              </h2>
            </div>

            {activity.supportTickets.length === 0 ? (
              <EmptyState
                icon={LifeBuoy}
                title="Henüz kayıt bulunmuyor."
                description="Bu kullanıcı henüz bir destek talebi oluşturmamış."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] text-xs uppercase tracking-wide text-[#9ca3af]">
                      <th className="px-5 py-2.5 font-medium">Konu</th>
                      <th className="px-5 py-2.5 font-medium">Öncelik</th>
                      <th className="px-5 py-2.5 font-medium">Durum</th>
                      <th className="px-5 py-2.5 font-medium">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.supportTickets.map((ticket) => (
                      <tr key={ticket.id} className="border-b border-[#f0f0f0] last:border-b-0">
                        <td className="px-5 py-2.5 font-medium text-[#111111]">
                          <Link href={`/admin/support/${ticket.id}`} className="hover:text-[#2563EB]">
                            {ticket.subject}
                          </Link>
                        </td>
                        <td className="px-5 py-2.5">
                          <Badge>{ticket.priority}</Badge>
                        </td>
                        <td className="px-5 py-2.5">
                          <Badge variant={ticket.status === "open" ? "warning" : "neutral"}>{ticket.status}</Badge>
                        </td>
                        <td className="px-5 py-2.5 text-[#4B5563]">{formatDate(ticket.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
