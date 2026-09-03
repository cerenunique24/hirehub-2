"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock3,
  MapPin,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  location: string | null;
  project_type: string | null;
  skills: string[] | null;
  status: string;
  deadline: string | null;
  created_at: string;
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const [bidAmount, setBidAmount] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadProject() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, title, description, budget, location, project_type, skills, status, deadline, created_at"
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Project detail error:", error);
        setProject(null);
      } else {
        setProject(data);
      }

      setLoading(false);
    }

    loadProject();
  }, [id]);

  async function handleSubmitProposal() {
    setSubmitMessage("");

    if (!bidAmount || Number(bidAmount) <= 0) {
      setSubmitMessage("Lütfen geçerli bir teklif tutarı girin.");
      return;
    }

    if (!deliveryDays || Number(deliveryDays) <= 0) {
      setSubmitMessage("Lütfen teslim süresini girin.");
      return;
    }

    if (!coverLetter.trim()) {
      setSubmitMessage("Lütfen teklif mesajınızı yazın.");
      return;
    }

    if (!project) {
      setSubmitMessage("Proje bilgisi bulunamadı.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setSubmitMessage("Teklif göndermek için giriş yapmalısınız.");
        return;
      }

      const { error } = await supabase.from("proposals").insert({
        project_id: project.id,
        freelancer_id: user.id,
        bid_amount: Number(bidAmount),
        delivery_days: Number(deliveryDays),
        cover_letter: coverLetter.trim(),
        status: "pending",
      });

      if (error) {
        console.error("Proposal submit error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        console.error("Proposal values:", {
          project_id: project.id,
          freelancer_id: user.id,
          bid_amount: Number(bidAmount),
          delivery_days: Number(deliveryDays),
          cover_letter: coverLetter.trim(),
        });

        if (error.code === "23505") {
          setSubmitMessage("Bu projeye daha önce teklif gönderdiniz.");
        } else {
          setSubmitMessage(
            error.message ||
              "Teklif gönderilirken bir hata oluştu. Lütfen tekrar deneyin."
          );
        }

        return;
      }

      // Teklif başarıyla gönderildi.
      setSubmitted(true);
      setSubmitMessage("");

      // Başarı popup'ını göster, ardından teklifler sayfasına yönlendir.
      setTimeout(() => {
        window.location.href = "/freelancers/proposals";
      }, 1500);
    } finally {
      setSubmitting(false);
    }
  }

  const formatBudget = (budget: number | null) => {
    if (budget === null) return "Bütçe belirtilmedi";

    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(budget);
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500">
        Proje yükleniyor...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center">
        <h1 className="text-xl font-semibold text-gray-900">
          Proje bulunamadı
        </h1>

        <Link
          href="/freelancers/discover"
          className="mt-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft size={16} />
          Projelere dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* GERİ */}
      <Link
        href="/freelancers/discover"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-black"
      >
        <ArrowLeft size={16} />
        Projelere Dön
      </Link>

      {/* ANA ALAN */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,760px)_400px]">
        {/* SOL: PROJE */}
        <main className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
          {/* PROJE HEADER */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              <span>Proje</span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>
                {project.status === "open" ? "Açık" : project.status}
              </span>
            </div>

            <div className="mt-3 flex items-start justify-between gap-6">
              <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-gray-950">
                {project.title}
              </h1>

              <span className="hidden shrink-0 items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Açık
              </span>
            </div>
          </div>

          {/* META */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-gray-500">
            {project.location && (
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-gray-400" />
                <span>{project.location}</span>
              </div>
            )}

            {project.project_type && (
              <div className="flex items-center gap-2">
                <Briefcase size={15} className="text-gray-400" />
                <span>{project.project_type}</span>
              </div>
            )}

            {project.deadline && (
              <div className="flex items-center gap-2">
                <Clock3 size={15} className="text-gray-400" />
                <span>
                  Son teslim{" "}
                  {new Date(project.deadline).toLocaleDateString("tr-TR")}
                </span>
              </div>
            )}
          </div>

          {/* DIVIDER */}
          <div className="my-8 h-px bg-gray-100" />

          {/* PROJE HAKKINDA */}
          <section>
            <h2 className="text-lg font-semibold text-gray-950">
              Proje Hakkında
            </h2>

            <p className="mt-4 max-w-2xl whitespace-pre-line text-[15px] leading-7 text-gray-600">
              {project.description || "Proje açıklaması bulunmuyor."}
            </p>
          </section>

          {/* YETENEKLER */}
          {project.skills && project.skills.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-gray-950">
                Aranan Yetenekler
              </h2>

              <div className="mt-4 flex flex-wrap gap-2">
                {project.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* PROJE BİLGİLERİ */}
          <section className="mt-10 border-t border-gray-100 pt-7">
            <h2 className="text-lg font-semibold text-gray-950">
              Proje Bilgileri
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-xs text-gray-400">Çalışma şekli</div>

                <div className="mt-1 text-sm font-medium text-gray-800">
                  {project.location || "Belirtilmedi"}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400">Proje tipi</div>

                <div className="mt-1 text-sm font-medium text-gray-800">
                  {project.project_type || "Belirtilmedi"}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400">Son teslim</div>

                <div className="mt-1 text-sm font-medium text-gray-800">
                  {project.deadline
                    ? new Date(project.deadline).toLocaleDateString("tr-TR")
                    : "Belirtilmedi"}
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* SAĞ: TEKLİF */}
        <aside className="lg:sticky lg:top-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-md">
            {!submitted ? (
              <>
                {/* TEKLİF HEADER */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                    Teklif
                  </div>

                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
                    Teklif Ver
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Bu proje için teklifini oluştur.
                  </p>
                </div>

                {/* BÜTÇE */}
                <div className="mt-5 rounded-2xl bg-gray-50 px-4 py-4">
                  <div className="text-xs font-medium text-gray-400">
                    Proje bütçesi
                  </div>

                  <div className="mt-1 text-xl font-bold tracking-tight text-gray-950">
                    {formatBudget(project.budget)}
                  </div>
                </div>

                {/* FORM */}
                <div className="mt-5 space-y-4">
                  {/* TUTAR + SÜRE */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-gray-700">
                        Teklif Tutarın
                      </label>

                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder={
                            project.budget
                              ? String(project.budget)
                              : "35000"
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 pr-10 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                        />

                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          TL
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-gray-700">
                        Teslim Süresi
                      </label>

                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          value={deliveryDays}
                          onChange={(e) => setDeliveryDays(e.target.value)}
                          placeholder="7"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 pr-10 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                        />

                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          gün
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MESAJ */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Teklif Mesajın
                    </label>

                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Projeye yaklaşımını, deneyimini ve nasıl çalışacağını kısaca anlat..."
                      rows={5}
                      className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                    />

                    <div className="mt-1.5 text-right text-[11px] text-gray-400">
                      Kısa ve net bir mesaj yeterli.
                    </div>
                  </div>

                  {/* HATA */}
                  {submitMessage && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-700">
                      {submitMessage}
                    </div>
                  )}

                  {/* BUTTON */}
                  <button
                    type="button"
                    onClick={handleSubmitProposal}
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={16} />

                    {submitting ? "Gönderiliyor..." : "Teklifi Gönder"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </aside>
      </div>

      {/* BAŞARI POPUP */}
      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2
                size={34}
                strokeWidth={2}
                className="text-green-600"
              />
            </div>

            <h2 className="mt-5 text-xl font-bold tracking-tight text-gray-950">
              Teklifiniz gönderildi
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Teklifiniz başarıyla proje sahibine iletildi.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Tekliflerinize yönlendiriliyorsunuz...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}