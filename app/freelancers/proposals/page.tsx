"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
    budget: number | null;
  } | null;
};

type FilterType = "all" | "pending" | "accepted" | "rejected";

export default function OffersPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    const supabase = createClient();

    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProposals([]);
      setErrorMessage("Oturum bilgisi bulunamadı.");
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
            budget
          )
        `
      )
      .eq("freelancer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Proposals load error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      setProposals([]);
      setErrorMessage("Teklifler yüklenirken bir hata oluştu.");
      setLoading(false);
      return;
    }

    const normalizedData: Proposal[] = (data ?? []).map((item: any) => ({
      id: item.id,
      project_id: item.project_id,
      bid_amount: Number(item.bid_amount),
      delivery_days: Number(item.delivery_days),
      cover_letter: item.cover_letter,
      status: item.status,
      created_at: item.created_at,
      project: Array.isArray(item.project)
        ? item.project[0] ?? null
        : item.project ?? null,
    }));

    setProposals(normalizedData);
    setLoading(false);
  };

  const getStatusKey = (status: string): FilterType => {
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
      normalized === "reddedildi"
    ) {
      return "rejected";
    }

    return "pending";
  };

  const getStatusLabel = (status: string) => {
    const key = getStatusKey(status);

    if (key === "accepted") return "Kabul Edildi";
    if (key === "rejected") return "Reddedildi";

    return "Bekleyen";
  };

  const filteredProposals = useMemo(() => {
    if (activeFilter === "all") {
      return proposals;
    }

    return proposals.filter(
      (proposal) => getStatusKey(proposal.status) === activeFilter
    );
  }, [proposals, activeFilter]);

  const counts = useMemo(() => {
    return {
      all: proposals.length,
      pending: proposals.filter(
        (proposal) => getStatusKey(proposal.status) === "pending"
      ).length,
      accepted: proposals.filter(
        (proposal) => getStatusKey(proposal.status) === "accepted"
      ).length,
      rejected: proposals.filter(
        (proposal) => getStatusKey(proposal.status) === "rejected"
      ).length,
    };
  }, [proposals]);

  const formatPrice = (amount: number) => {
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

  return (
    <main className="w-full p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Tekliflerim
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Gönderdiğin teklifleri ve proje süreçlerini takip et.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`rounded-full px-5 py-2 text-sm transition ${
            activeFilter === "all"
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Tümü ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("pending")}
          className={`rounded-full px-5 py-2 text-sm transition ${
            activeFilter === "pending"
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Bekleyen ({counts.pending})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("accepted")}
          className={`rounded-full px-5 py-2 text-sm transition ${
            activeFilter === "accepted"
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Kabul Edilen ({counts.accepted})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("rejected")}
          className={`rounded-full px-5 py-2 text-sm transition ${
            activeFilter === "rejected"
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Reddedilen ({counts.rejected})
        </button>
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Tekliflerin yükleniyor...
        </div>
      )}

      {!loading && errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
          <h2 className="font-medium text-red-800">
            Teklifler yüklenemedi
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={loadProposals}
            className="mt-5 rounded-xl bg-black px-5 py-2.5 text-sm text-white transition hover:bg-gray-800"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {!loading &&
        !errorMessage &&
        filteredProposals.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeFilter === "all"
                ? "Henüz teklif göndermedin"
                : "Bu kategoride teklif bulunmuyor"}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {activeFilter === "all"
                ? "Projeleri keşfet ve sana uygun projelere teklif gönder."
                : "Farklı bir filtre seçerek diğer tekliflerini görebilirsin."}
            </p>

            {activeFilter === "all" && (
              <Link
                href="/freelancers/discover"
                className="mt-5 inline-flex rounded-xl bg-black px-5 py-2.5 text-sm text-white transition hover:bg-gray-800"
              >
                Projeleri Keşfet
              </Link>
            )}
          </div>
        )}

      {!loading &&
        !errorMessage &&
        filteredProposals.length > 0 && (
          <div className="space-y-5">
            {filteredProposals.map((proposal) => {
              const project = proposal.project;

              return (
                <div
                  key={proposal.id}
                  className="flex w-full items-center justify-between gap-6 rounded-2xl border border-gray-200 bg-white p-6 transition hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {project?.title ?? "Proje bulunamadı"}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${getStatusClass(
                          proposal.status
                        )}`}
                      >
                        {getStatusLabel(proposal.status)}
                      </span>
                    </div>

                    <p className="mb-5 text-sm text-gray-500">
                      {project?.project_type ?? "Proje"}
                    </p>

                    <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
                      <div>
                        <span className="mb-1 block text-gray-400">
                          Teklif Tutarı
                        </span>

                        <span className="font-medium text-gray-900">
                          {formatPrice(proposal.bid_amount)}
                        </span>
                      </div>

                      <div>
                        <span className="mb-1 block text-gray-400">
                          Teslim Süresi
                        </span>

                        <span className="font-medium text-gray-900">
                          {proposal.delivery_days} gün
                        </span>
                      </div>

                      <div>
                        <span className="mb-1 block text-gray-400">
                          Gönderim Tarihi
                        </span>

                        <span className="font-medium text-gray-900">
                          {formatDate(proposal.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/freelancers/proposals/${proposal.id}`}
                    className="shrink-0 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                  >
                    Teklifimi Göster
                  </Link>
                </div>
              );
            })}
          </div>
        )}
    </main>
  );
}