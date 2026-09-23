"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  MessageCircle,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  client_id: string;
  title: string;
  project_type: string | null;
  description: string | null;
  budget: number | null;
};

type Proposal = {
  id: string;
  project_id: string;
  freelancer_id: string;
  bid_amount: number | null;
  delivery_days: number | null;
  cover_letter: string | null;
  status: string | null;
  created_at: string;
  project: Project | null;
};

type ProposalDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ProposalDetailPage({
  params,
}: ProposalDetailPageProps) {
  const supabase = useMemo(() => createClient(), []);

  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);

  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function resolveParams() {
      const { id } = await params;
      setProposalId(id);
    }

    void resolveParams();
  }, [params]);

  useEffect(() => {
    if (!proposalId) {
      return;
    }

    async function loadProposal() {
      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setErrorMessage(
            "Teklif detayını görmek için giriş yapmalısınız."
          );
          return;
        }

        /*
         * Önce teklifin kendisini alıyoruz.
         */
        const {
          data: proposalData,
          error: proposalError,
        } = await supabase
          .from("proposals")
          .select(
            `
              id,
              project_id,
              freelancer_id,
              bid_amount,
              delivery_days,
              cover_letter,
              status,
              created_at
            `
          )
          .eq("id", proposalId)
          .eq("freelancer_id", user.id)
          .single();

        if (proposalError || !proposalData) {
          console.error(
            "Proposal detail load error:",
            proposalError
              ? {
                  message: proposalError.message,
                  details: proposalError.details,
                  hint: proposalError.hint,
                  code: proposalError.code,
                }
              : "Teklif bulunamadı."
          );

          setErrorMessage(
            "Teklif detayları yüklenemedi veya bu teklife erişim yetkiniz yok."
          );

          return;
        }

        /*
         * Projeyi ayrı sorguluyoruz.
         *
         * Burada relation kullanmıyoruz. Böylece
         * proposals -> projects ilişkisinin Supabase
         * tarafından otomatik çözülmesine bağlı kalmıyoruz.
         */
        const {
          data: projectData,
          error: projectError,
        } = await supabase
          .from("projects")
          .select(
            `
              id,
              client_id,
              title,
              project_type,
              description,
              budget
            `
          )
          .eq("id", proposalData.project_id)
          .maybeSingle();

        if (projectError) {
          console.error(
            "Project detail load error:",
            {
              message: projectError.message,
              details: projectError.details,
              hint: projectError.hint,
              code: projectError.code,
              projectId: proposalData.project_id,
            }
          );

          setErrorMessage(
            `Proje bilgileri yüklenemedi: ${projectError.message}`
          );

          return;
        }

        if (!projectData) {
          console.error(
            "Project detail load error: proje bulunamadı",
            {
              projectId: proposalData.project_id,
            }
          );

          setErrorMessage(
            "Bu teklifin bağlı olduğu proje bulunamadı."
          );

          return;
        }

        const normalizedProposal: Proposal = {
          id: proposalData.id,
          project_id: proposalData.project_id,
          freelancer_id: proposalData.freelancer_id,
          bid_amount:
            proposalData.bid_amount !== null
              ? Number(proposalData.bid_amount)
              : null,
          delivery_days:
            proposalData.delivery_days !== null
              ? Number(proposalData.delivery_days)
              : null,
          cover_letter: proposalData.cover_letter,
          status: proposalData.status,
          created_at: proposalData.created_at,
          project: {
            id: projectData.id,
            client_id: projectData.client_id,
            title: projectData.title,
            project_type: projectData.project_type,
            description: projectData.description,
            budget:
              projectData.budget !== null
                ? Number(projectData.budget)
                : null,
          },
        };

        setProposal(normalizedProposal);
      } catch (error) {
        console.error(
          "Unexpected proposal detail error:",
          error
        );

        setErrorMessage(
          "Teklif detayları yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProposal();
  }, [proposalId, supabase]);

  async function handleWithdrawProposal() {
    if (!proposal) {
      return;
    }

    const confirmed = window.confirm(
      "Bu teklifi geri çekmek istediğinizden emin misiniz?"
    );

    if (!confirmed) {
      return;
    }

    setWithdrawing(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage(
          "Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın."
        );
        return;
      }

      const { error: deleteError } = await supabase
        .from("proposals")
        .delete()
        .eq("id", proposal.id)
        .eq("freelancer_id", user.id);

      if (deleteError) {
        console.error(
          "Proposal withdraw error:",
          {
            message: deleteError.message,
            details: deleteError.details,
            hint: deleteError.hint,
            code: deleteError.code,
          }
        );

        setErrorMessage(
          `Teklif geri çekilemedi: ${deleteError.message}`
        );

        return;
      }

      window.location.href = "/freelancers/proposals";
    } catch (error) {
      console.error(
        "Unexpected withdraw error:",
        error
      );

      setErrorMessage(
        "Teklif geri çekilirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setWithdrawing(false);
    }
  }

  function formatPrice(amount: number | null) {
    if (amount === null || amount === undefined) {
      return "Belirtilmemiş";
    }

    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(date: string) {
    if (!date) {
      return "Belirtilmemiş";
    }

    return new Date(date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getStatusKey(status: string | null) {
    const normalized = status?.toLowerCase() ?? "pending";

    if (
      normalized === "accepted" ||
      normalized === "kabul edildi" ||
      normalized === "kabul_edildi"
    ) {
      return "accepted";
    }

    if (
      normalized === "rejected" ||
      normalized === "reddedildi"
    ) {
      return "rejected";
    }

    return "pending";
  }

  function getStatusLabel(status: string | null) {
    const key = getStatusKey(status);

    if (key === "accepted") {
      return "Kabul Edildi";
    }

    if (key === "rejected") {
      return "Reddedildi";
    }

    return "İnceleniyor";
  }

  function getStatusClass(status: string | null) {
    const key = getStatusKey(status);

    if (key === "accepted") {
      return "bg-green-100 text-green-700";
    }

    if (key === "rejected") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  }

  if (loading) {
    return (
      <main className="w-full p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">
            Teklif detayları yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage || !proposal) {
    return (
      <main className="w-full p-6">
        <Link
          href="/freelancers/proposals"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Tekliflerime Dön
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
          <h1 className="text-lg font-semibold text-red-800">
            Teklif bulunamadı
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {errorMessage ||
              "Bu teklif mevcut değil veya erişim yetkiniz yok."}
          </p>

          <Link
            href="/freelancers/proposals"
            className="mt-5 inline-flex rounded-xl bg-[var(--color-primary-600)] px-5 py-2.5 text-sm text-white transition hover:bg-[var(--color-primary-700)]"
          >
            Tekliflerime Dön
          </Link>
        </div>
      </main>
    );
  }

  const project = proposal.project;
  const statusKey = getStatusKey(proposal.status);
  const isPending = statusKey === "pending";

  return (
    <main className="w-full p-6">
      {/* HEADER */}

      <div className="mb-8">
        <Link
          href="/freelancers/proposals"
          className="mb-5 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Tekliflerime Dön
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">
                Teklif Detayı
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                  proposal.status
                )}`}
              >
                {getStatusLabel(proposal.status)}
              </span>
            </div>

            <p className="text-sm text-gray-500">
              Gönderdiğin teklifin detaylarını ve proje bilgilerini görüntüle.
            </p>
          </div>

          {project && (
            <Link
              href={`/freelancers/discover/${project.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Projeyi Görüntüle
              <ExternalLink size={16} />
            </Link>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* MAIN CONTENT */}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* PROJECT */}

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-6">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Proje
              </p>

              <h2 className="mt-2 text-xl font-semibold text-gray-900">
                {project?.title ?? "Proje bulunamadı"}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {project?.project_type ?? "Proje"}
              </p>
            </div>

            {project?.description && (
              <div className="border-t border-gray-100 pt-6">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Proje Açıklaması
                </h3>

                <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
                  {project.description}
                </p>
              </div>
            )}
          </section>

          {/* COVER LETTER */}

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <FileText
                  size={19}
                  className="text-gray-700"
                />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900">
                  Teklif Mesajım
                </h2>

                <p className="text-xs text-gray-400">
                  Proje sahibine gönderdiğin mesaj
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-5">
              <p className="whitespace-pre-line text-sm leading-7 text-gray-700">
                {proposal.cover_letter ||
                  "Teklif mesajı eklenmemiş."}
              </p>
            </div>
          </section>
        </div>

        {/* SIDEBAR */}

        <aside className="space-y-6">
          {/* PROPOSAL INFO */}

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-5 font-semibold text-gray-900">
              Teklif Bilgileri
            </h2>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Wallet
                    size={17}
                    className="text-gray-700"
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Teklif Tutarı
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {formatPrice(proposal.bid_amount)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Clock3
                    size={17}
                    className="text-gray-700"
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Teslim Süresi
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {proposal.delivery_days
                      ? `${proposal.delivery_days} gün`
                      : "Belirtilmemiş"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <CalendarDays
                    size={17}
                    className="text-gray-700"
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Gönderim Tarihi
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {formatDate(proposal.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {isPending && (
              <button
                type="button"
                onClick={handleWithdrawProposal}
                disabled={withdrawing}
                className="mt-6 w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {withdrawing
                  ? "Teklif geri çekiliyor..."
                  : "Teklifi Geri Çek"}
              </button>
            )}
          </section>

          {/* PROJECT BUDGET */}

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-gray-900">
              Proje Bütçesi
            </h2>

            <p className="text-2xl font-semibold text-gray-900">
              {formatPrice(project?.budget ?? null)}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Proje sahibinin belirlediği bütçe
            </p>
          </section>

          {/* MESSAGE */}

          <section className="rounded-xl bg-[var(--color-primary-600)] p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <MessageCircle size={19} />
              </div>

              <div>
                <h2 className="font-semibold">
                  Proje Sahibiyle İletişim
                </h2>

                <p className="mt-1 text-xs text-white/60">
                  Bu teklif hakkında mesajlaş
                </p>
              </div>
            </div>

            {project?.client_id ? (
              <Link
                href={`/freelancers/messages?user=${encodeURIComponent(
                  project.client_id
                )}&proposal=${encodeURIComponent(
                  proposal.id
                )}`}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-gray-100"
              >
                Mesaj Gönder
                <MessageCircle size={16} />
              </Link>
            ) : (
              <div className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-center text-sm text-white/60">
                Proje sahibi bilgisi bulunamadı.
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* PROPOSAL PROCESS */}

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
            <CheckCircle2
              size={19}
              className="text-gray-700"
            />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              Teklif Süreci
            </h2>

            <p className="text-xs text-gray-400">
              Teklifinin mevcut durumu
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900">
              Teklif Gönderildi
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Teklifin proje sahibine ulaştı.
            </p>
          </div>

          <div
            className={`rounded-xl border p-4 ${
              statusKey === "pending"
                ? "border-yellow-200 bg-yellow-50"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            <p className="text-sm font-medium text-gray-900">
              İnceleniyor
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Proje sahibi teklifini değerlendiriyor.
            </p>
          </div>

          <div
            className={`rounded-xl border p-4 ${
              statusKey === "accepted"
                ? "border-green-200 bg-green-50"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            <p className="text-sm font-medium text-gray-900">
              Kabul Edildi
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Teklif kabul edildiğinde burada görünür.
            </p>
          </div>

          <div
            className={`rounded-xl border p-4 ${
              statusKey === "accepted"
                ? "border-blue-200 bg-blue-50"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            <p className="text-sm font-medium text-gray-900">
              Proje Başladı
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Kabul sonrası proje süreci burada takip edilecek.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}