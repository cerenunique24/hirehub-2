"use client";

import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

export default function ClientCompletePage() {
  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <div className="min-h-screen grid lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden lg:flex bg-black text-white p-12 xl:p-16 flex-col justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight">
              CollaCrew
            </div>

            <div className="mt-24 max-w-md">
              <p className="text-sm text-white/50 mb-5">
                Müşteri hesabı
              </p>

              <h1 className="text-5xl xl:text-6xl font-semibold tracking-tight leading-[1.02]">
                Projelerin
                <br />
                burada başlıyor.
              </h1>

              <p className="mt-7 text-white/60 text-base leading-7 max-w-sm">
                Profilin hazır. Artık ihtiyacına uygun
                freelancerları ve koalisyonları keşfedebilirsin.
              </p>
            </div>
          </div>

          <div className="text-sm text-white/40">
            © {new Date().getFullYear()} CollaCrew
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-black flex items-center justify-center">
              <Check
                size={36}
                strokeWidth={2.5}
                className="text-white"
              />
            </div>

            <p className="mt-8 text-sm font-medium text-black/40">
              03 / 03
            </p>

            <h2 className="mt-3 text-4xl font-semibold tracking-tight">
              Profilin hazır.
            </h2>

            <p className="mt-4 text-black/50 leading-7">
              CollaCrew müşteri hesabın başarıyla oluşturuldu.
              Artık projeni oluşturabilir ve doğru yetenekleri
              keşfetmeye başlayabilirsin.
            </p>

            <div className="mt-8 bg-white border border-black/5 rounded-2xl p-5 text-left shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-black/[0.04] flex items-center justify-center">
                  <Check size={17} />
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Hesap oluşturuldu
                  </p>

                  <p className="text-xs text-black/40 mt-1">
                    CollaCrew hesabın aktif.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <div className="w-9 h-9 rounded-xl bg-black/[0.04] flex items-center justify-center">
                  <Check size={17} />
                </div>

                <div>
                  <p className="text-sm font-medium">
                    E-posta doğrulandı
                  </p>

                  <p className="text-xs text-black/40 mt-1">
                    E-posta adresin doğrulandı.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <div className="w-9 h-9 rounded-xl bg-black/[0.04] flex items-center justify-center">
                  <Check size={17} />
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Profil tamamlandı
                  </p>

                  <p className="text-xs text-black/40 mt-1">
                    Proje oluşturmaya hazırsın.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/client/dashboard"
              className="mt-8 w-full h-13 rounded-xl bg-black text-white font-medium flex items-center justify-center gap-2 hover:bg-black/90 transition"
            >
              Müşteri paneline geç
              <ArrowRight size={18} />
            </Link>

            <p className="mt-5 text-xs text-black/30">
              Profil bilgilerini daha sonra Ayarlar bölümünden
              değiştirebilirsin.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}