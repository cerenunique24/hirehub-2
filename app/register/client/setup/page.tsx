"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const categories = [
  "Web Tasarım",
  "Web Geliştirme",
  "Mobil Uygulama",
  "UI/UX Tasarım",
  "Marka Tasarımı",
  "Grafik Tasarım",
  "E-Ticaret",
  "Yazılım Geliştirme",
  "Dijital Pazarlama",
  "İçerik Üretimi",
  "3D Tasarım",
  "Mimari & İç Mekân",
  "Diğer",
];

export default function ClientSetupPage() {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    const initializePage = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const savedProject = localStorage.getItem(
        "client_project_draft"
      );

      if (savedProject) {
        try {
          const project = JSON.parse(savedProject);

          setProjectName(project.projectName || "");
          setCategory(project.category || "");
          setDescription(project.description || "");
        } catch (error) {
          console.error(
            "Proje taslağı okunamadı:",
            error
          );
        }
      }

      setLoading(false);
    };

    initializePage();
  }, [router, supabase]);

  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    if (!projectName.trim()) {
      setError("Lütfen projenize bir isim verin.");
      return;
    }

    if (!category) {
      setError("Lütfen bir kategori seçin.");
      return;
    }

    if (description.trim().length < 30) {
      setError("Projenizi en az 30 karakterle anlatın.");
      return;
    }

    setSubmitting(true);

    try {
      const existingDraft = localStorage.getItem(
        "client_project_draft"
      );

      const existingData = existingDraft
        ? JSON.parse(existingDraft)
        : {};

      const projectDraft = {
        ...existingData,
        projectName: projectName.trim(),
        category,
        description: description.trim(),
      };

      localStorage.setItem(
        "client_project_draft",
        JSON.stringify(projectDraft)
      );

      router.push("/client/projects/new/details");
    } catch (error) {
      console.error("Proje taslağı kaydedilemedi:", error);

      setError(
        "Proje bilgileri kaydedilirken bir hata oluştu."
      );

      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push("/client/dashboard");
  };

  const improveBrief = async () => {
    if (!description.trim()) {
      setError("AI ile geliştirmek için önce kısa bir proje açıklaması yazın.");
      return;
    }

    setAnalyzing(true);
    setError("");
    try {
      const response = await fetch("/api/ai/analyze-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: projectName, description }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "AI analizi tamamlanamadı.");

      const analysis = result.analysis;
      const improvedDescription = [analysis.summary, ...(analysis.keyRequirements ?? [])]
        .filter(Boolean)
        .join("\n\n");
      if (improvedDescription) setDescription(improvedDescription);
      if (!category && categories.includes(analysis.category)) setCategory(analysis.category);

      const existingDraft = JSON.parse(localStorage.getItem("client_project_draft") || "{}");
      localStorage.setItem("client_project_draft", JSON.stringify({
        ...existingDraft,
        expertise: Array.isArray(analysis.requiredSkills) ? analysis.requiredSkills : existingDraft.expertise,
      }));
    } catch (aiError) {
      setError(aiError instanceof Error ? aiError.message : "AI analizi sırasında bir sorun oluştu.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)]">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <Loader2
            className="animate-spin"
            size={28}
          />

          <p className="text-sm">
            Hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">

        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft size={18} />
            Geri
          </button>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary-600)] text-white">
            <BriefcaseBusiness size={20} />
          </div>

          <div className="w-[52px]" />
        </div>

        {/* Progress */}
        <div className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              Proje bilgileri
            </span>

            <span className="text-sm text-gray-500">
              Adım 1 / 2
            </span>
          </div>

          <div className="flex gap-2">
            <div className="h-2 flex-1 rounded-full bg-[var(--color-primary-600)]" />
            <div className="h-2 flex-1 rounded-full bg-gray-200" />
          </div>
        </div>

        {/* Page Title */}
        <div className="mb-10">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-600)] text-white">
            <FileText size={25} />
          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.01em] text-neutral-900 sm:text-4xl">
            Projenden bahset.
          </h1>

          <p className="mt-3 max-w-xl text-base leading-7 text-gray-500">
            İhtiyacını anlat, projen için doğru uzmanları ve
            ekipleri bulmana yardımcı olalım.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="space-y-7">

            {/* Project Name */}
            <div>
              <label
                htmlFor="projectName"
                className="mb-2 block text-sm font-semibold text-neutral-900"
              >
                Proje adı
              </label>

              <input
                id="projectName"
                type="text"
                value={projectName}
                onChange={(e) =>
                  setProjectName(e.target.value)
                }
                placeholder="Örn. Yeni e-ticaret platformumuz"
                className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-gray-400 focus:border-[var(--color-primary-600)] focus:ring-4 focus:ring-[var(--color-primary-600)]/5"
              />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-semibold text-neutral-900"
              >
                Proje kategorisi
              </label>

              <select
                id="category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary-600)] focus:ring-4 focus:ring-[var(--color-primary-600)]/5"
              >
                <option value="">
                  Bir kategori seçin
                </option>

                {categories.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-neutral-900"
                >
                  Projeni anlat
                </label>

                <span className="text-xs text-gray-400">
                  {description.length} karakter
                </span>
              </div>

              <textarea
                id="description"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Ne yapmak istiyorsun? Projenin amacı nedir? Nasıl bir sonuca ulaşmak istiyorsun?"
                rows={7}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3.5 text-sm leading-6 text-[var(--color-text-primary)] outline-none transition placeholder:text-gray-400 focus:border-[var(--color-primary-600)] focus:ring-4 focus:ring-[var(--color-primary-600)]/5"
              />

              <p className="mt-2 text-xs leading-5 text-gray-400">
                En az 30 karakter. Ne kadar fazla detay verirsen,
                sana o kadar doğru uzmanları önerebiliriz.
              </p>
            </div>

            {/* AI Suggestion */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-600)] text-white">
                  <Sparkles size={18} />
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-900">
                    AI ile proje brief&apos;ini geliştir
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Projeni birkaç cümleyle anlat. CollaCrew AI,
                    açıklamanı daha detaylı ve anlaşılır bir proje
                    brief&apos;ine dönüştürmene yardımcı olacak.
                  </p>

                  <button
                    type="button"
                    onClick={() => void improveBrief()}
                    disabled={analyzing}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:opacity-70 disabled:cursor-not-allowed disabled:text-gray-400"
                  >
                    {analyzing && <Loader2 size={15} className="animate-spin" />}
                    {analyzing ? "AI brief'i geliştiriyor..." : "AI ile brief'i geliştir"}
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Check size={16} />
                Hesap oluşturuldu
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    Devam et
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Bir sonraki adımda bütçe, süre ve ihtiyaç duyduğun
          uzmanlıkları belirleyeceksin.
        </p>
      </div>
    </main>
  );
}
