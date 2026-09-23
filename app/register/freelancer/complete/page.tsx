"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";

export default function FreelancerCompletePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-[32px] bg-white p-7 text-center shadow-[0_20px_70px_rgba(0,0,0,0.07)] sm:p-12">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
              <Check
                size={26}
                strokeWidth={3}
                className="text-white"
              />
            </div>
          </div>

          <div className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3.5 py-2 text-xs font-medium text-gray-500">
            <Sparkles size={13} />
            Profilin hazır
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.01em] text-gray-950 sm:text-4xl">
            Hoş geldin!
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-gray-500">
            Freelancer profilin başarıyla oluşturuldu.
            Artık CollaCrew üzerinde projeleri keşfedebilir,
            teklif gönderebilir ve müşterilerle çalışmaya
            başlayabilirsin.
          </p>

          <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <Check
                  size={17}
                  className="text-green-600"
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Profil oluşturuldu
                </p>

                <p className="mt-0.5 text-xs text-gray-500">
                  Bilgilerin başarıyla kaydedildi.
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <Check
                  size={17}
                  className="text-green-600"
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900">
                  E-posta doğrulandı
                </p>

                <p className="mt-0.5 text-xs text-gray-500">
                  Hesabın kullanıma hazır.
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <Check
                  size={17}
                  className="text-green-600"
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Proje eşleşmeleri başlayabilir
                </p>

                <p className="mt-0.5 text-xs text-gray-500">
                  Sana uygun fırsatları keşfetmeye hazırsın.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/freelancers/dashboard")
            }
            className="mx-auto mt-8 flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-700)]"
          >
            Freelancer Paneline Git
            <ArrowRight size={17} />
          </button>

          <p className="mt-4 text-xs text-gray-400">
            Profil bilgilerini daha sonra Profilim
            bölümünden güncelleyebilirsin.
          </p>
        </div>
      </div>
    </main>
  );
}