import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, FileText } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatBytes } from "@/lib/careers";

import { getAdminCareerApplicationDetail } from "../data";
import StatusControl from "./StatusControl";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminCareerApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const application = await getAdminCareerApplicationDetail(supabase, id);

  if (!application) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/careers"
        className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] transition hover:text-[#2563EB]"
      >
        <ChevronLeft size={16} />
        Kariyer başvurularına dön
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-[320px] lg:shrink-0">
          <section className="border border-[#e5e7eb] bg-white">
            <div className="border-b border-[#e5e7eb] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#111111]">Başvuru Bilgisi</h2>
            </div>

            <div className="space-y-3 px-5 py-4 text-sm">
              <div>
                <p className="text-xs text-[#9ca3af]">Ad Soyad</p>
                <p className="mt-0.5 font-medium text-[#111111]">
                  {application.firstName} {application.lastName}
                </p>
              </div>

              <div>
                <p className="text-xs text-[#9ca3af]">E-posta</p>
                <p className="mt-0.5 break-all text-[#111111]">{application.email}</p>
              </div>

              <div>
                <p className="text-xs text-[#9ca3af]">Uzmanlık Alanı</p>
                <p className="mt-0.5 text-[#111111]">{application.expertise}</p>
              </div>

              <div>
                <p className="text-xs text-[#9ca3af]">Başvuru Tarihi</p>
                <p className="mt-0.5 text-[#111111]">{formatDateTime(application.createdAt)}</p>
              </div>

              <div className="border-t border-[#f0f0f0] pt-3">
                <p className="mb-2 text-xs text-[#9ca3af]">Durum</p>
                <StatusControl applicationId={application.id} initialStatus={application.status} />
              </div>
            </div>
          </section>
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          <section className="border border-[#e5e7eb] bg-white">
            <div className="border-b border-[#e5e7eb] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#111111]">Kendini Tanıtımı</h2>
            </div>
            <div className="px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#374151]">{application.introduction}</p>
            </div>
          </section>

          <section className="border border-[#e5e7eb] bg-white">
            <div className="border-b border-[#e5e7eb] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#111111]">
                Ekler {application.files.length > 0 && `(${application.files.length})`}
              </h2>
            </div>

            {application.files.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#9ca3af]">Başvuruya eklenmiş bir dosya yok.</div>
            ) : (
              <ul className="divide-y divide-[#f0f0f0]">
                {application.files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileText size={16} className="shrink-0 text-[#9ca3af]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#111111]">{file.fileName}</p>
                        <p className="text-xs text-[#9ca3af]">{formatBytes(file.fileSize)}</p>
                      </div>
                    </div>

                    {file.signedUrl ? (
                      <a
                        href={file.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#2563EB] hover:underline"
                      >
                        <Download size={14} />
                        İndir
                      </a>
                    ) : (
                      <span className="shrink-0 text-xs text-[#9ca3af]">Bağlantı oluşturulamadı</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
