"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

type Proposal = {
  id: string;
  project_id: string;
  bid_amount: number;
  delivery_days: number;
  cover_letter: string;
  status: string;
  created_at: string;
  project: {
    id: string;
    title: string;
    project_type: string | null;
    description: string | null;
    budget: number | null;
  } | null;
};

type ProposalDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ProposalDetailPage({
  params,
}: ProposalDetailPageProps) {
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    params.then(({ id }) => {
      setProposalId(id);
    });
  }, [params]);

  useEffect(() => {
    if (proposalId) {
      loadProposal(proposalId);
    }
  }, [proposalId]);

  const loadProposal = async (id: string) => {
    const supabase = createClient();

    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("Teklif detayını görmek için giriş yapmalısınız.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("proposals")
      .select(
        `
          id,
          project_id,
          bid_amount,
          delivery_days,
          cover_letter,
          status,
          created_at,
          project:projects (
            id,
            title,
            project_type,
            description,
            budget
          )
        `
      )
      .eq("id", id)
      .eq("freelancer_id", user.id)
      .single();

    if (error) {
      console.error("Proposal detail load error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      setProposal(null);
      setErrorMessage("Teklif detayları yüklenemedi.");
      setLoading(false);
      return;
    }

    const normalizedProposal: Proposal = {
      id: data.id,
      project_id: data.project_id,
      bid_amount: Number(data.bid_amount),
      delivery_days: Number(data.delivery_days),
      cover_letter: data.cover_letter,
      status: data.status,
      created_at: data.created_at,
      project: Array.isArray(data.project)
        ? data.project[0] ?? null
        : data.project ?? null,
    };

    setProposal(normalizedProposal);
    setLoading(false);
  };

  const handleWithdrawProposal = async () => {
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

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.alert("Oturum bilgisi bulunamadı.");
        return;
      }

      const { error } = await supabase
        .from("proposals")
        .delete()
        .eq("id", proposal.id)
        .eq("freelancer_id", user.id);

      if (error) {
        console.error("Proposal withdraw error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        window.alert(
          "Teklif geri çekilemedi. Lütfen tekrar deneyin."
        );

        return;
      }

      window.location.href = "/freelancers/proposals";
    } finally {
      setWithdrawing(false);
    }
  };

  const formatPrice = (amount: number | null) => {
    if (amount === null || amount === undefined) {
      return "Belirtilmemiş";
    }

    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusKey = (status: string) => {
    const normalized = status.toLowerCase();

    if (
      normalized === "accepted" ||
      normalized === "kabul edildi" ||
      normalized === "kabul_edildi"
    ) {
      return "accepted";
    }

    if (
      normalized === "rejected" ||
      normalized === "reddedildi" ||
      normalized === "rejected"
    ) {
      return "rejected";
    }

    return "pending";
  };

  const getStatusLabel = (status: string) => {
    const key = getStatusKey(status);

    if (key === "accepted") {
      return "Kabul Edildi";
    }

    if (key === "rejected") {
      return "Reddedildi";
    }

    return "Bekleyen";
  };

  const getStatusClass = (status: string) => {
    const key = getStatusKey(status);

    if (key === "accepted") {
      return "bg-green-100 text-green-700";
    }

    if (key === "rejected") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  if (loading) {
    return (
      <main className="w-full p-8">
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
      <main className="w-full p-8">
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
            {errorMessage || "Bu teklif mevcut değil."}
          </p>

          <Link
            href="/freelancers/proposals"
            className="mt-5 inline-flex rounded-xl bg-black px-5 py-2.5 text-sm text-white transition hover:bg-gray-800"
          >
            Tekliflerime Dön
          </Link>
        </div>
      </main>
    );
  }

  const project = proposal.project;
  const isPending = getStatusKey(proposal.status) === "pending";

  return (
    <main className="w-full p-8">
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

      {/* MAIN CONTENT */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* PROJECT */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
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
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <FileText size={19} className="text-gray-700" />
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
                {proposal.cover_letter}
              </p>
            </div>
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6">
          {/* PROPOSAL INFO */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-5 font-semibold text-gray-900">
              Teklif Bilgileri
            </h2>

            <div className="space-y-5">
              {/* PRICE */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Wallet size={17} className="text-gray-700" />
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

              {/* DELIVERY */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Clock3 size={17} className="text-gray-700" />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Teslim Süresi
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {proposal.delivery_days} gün
                  </p>
                </div>
              </div>

              {/* DATE */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <CalendarDays size={17} className="text-gray-700" />
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

            {/* WITHDRAW */}
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
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
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
          <section className="rounded-2xl bg-black p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <MessageCircle size={19} />
              </div>

              <div>
                <h2 className="font-semibold">
                  Proje Sahibiyle İletişim
                </h2>

                <p className="mt-1 text-xs text-white/60">
                  Proje hakkında iletişime geç
                </p>
              </div>
            </div>

            <Link
              href="/freelancers/messages"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-gray-100"
            >
              Mesaj Gönder
              <MessageCircle size={16} />
            </Link>
          </section>
        </aside>
      </div>

      {/* PROPOSAL PROCESS */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
            <CheckCircle2 size={19} className="text-gray-700" />
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
          {/* SENT */}
          <div
            className={`rounded-xl border p-4 ${
              isPending
                ? "border-yellow-200 bg-yellow-50"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            <p className="text-sm font-medium text-gray-900">
              Teklif Gönderildi
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Teklifin proje sahibine ulaştı.
            </p>
          </div>

          {/* REVIEW */}
          <div
            className={`rounded-xl border p-4 ${
              isPending
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

          {/* ACCEPTED */}
          <div
            className={`rounded-xl border p-4 ${
              getStatusKey(proposal.status) === "accepted"
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

          {/* STARTED */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
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