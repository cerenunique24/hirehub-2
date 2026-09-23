"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

export default function FreelancerSetupPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-[28px] bg-white shadow-[0_20px_70px_rgba(0,0,0,0.06)] sm:rounded-[32px]">
          <div className="p-7 sm:p-12">
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-600)] text-white">
                <Sparkles size={24} strokeWidth={1.8} />
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                Profil kurulumu
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.01em] text-gray-950 sm:text-4xl">
                Profilini birlikte oluşturalım
              </h1>

              <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-gray-500 sm:text-base">
                Sana uygun projeleri ve ekipleri bulabilmemiz için
                profesyonel profilini birkaç kısa adımda oluşturalım.
              </p>

              <div className="mx-auto mt-8 grid max-w-md gap-3 text-left">
                {[
                  "Çalışma alanlarını ve yapabildiğin işleri belirle",
                  "Becerilerini, deneyimini ve çalışma tercihlerini ekle",
                  "Yapay zekâ destekli uzmanlık profilini oluştur",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5"
                  >
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0 text-gray-900"
                    />

                    <span className="text-sm leading-6 text-gray-600">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
                <span>4 adım</span>
                <span>•</span>
                <span>Yaklaşık 3 dakika</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push("/register/freelancer/onboarding")
                }
                className="mt-8 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-700)]"
              >
                Profile başla
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                onClick={() => router.back()}
                className="mt-3 h-11 px-5 text-sm font-medium text-gray-400 transition hover:text-gray-900"
              >
                Daha sonra tamamla
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}