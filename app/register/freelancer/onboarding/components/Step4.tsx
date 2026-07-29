"use client";

import { useRouter } from "next/navigation";

type Step4Props = {
  onBack: () => void;
};

export default function Step4({
  onBack,
}: Step4Props) {
  const router = useRouter();

  return (
    <>
      <div className="text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-5xl">✓</span>
        </div>

        <h1 className="text-4xl font-bold mt-8">
          Profilin Hazır!
        </h1>

        <p className="text-gray-500 mt-4 max-w-xl mx-auto">
          Tebrikler! Freelancer profilini başarıyla oluşturdun.
          Artık projeleri keşfedebilir, teklif gönderebilir ve
          HireHub'da çalışmaya başlayabilirsin.
        </p>
      </div>

      {/* Özet Kartı */}
      <div className="mt-12 bg-gray-50 rounded-3xl p-8">
        <h2 className="text-xl font-semibold mb-6">
          Profil Özeti
        </h2>

        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-500">
              Uzmanlık Alanları
            </span>

            <span className="font-medium">
              ✓ Tamamlandı
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">
              Yetenekler
            </span>

            <span className="font-medium">
              ✓ Tamamlandı
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">
              Portfolyo
            </span>

            <span className="font-medium">
              ✓ Eklendi
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">
              Çalışma Tercihleri
            </span>

            <span className="font-medium">
              ✓ Kaydedildi
            </span>
          </div>
        </div>
      </div>

      {/* Profil Tamamlanma */}
      <div className="mt-8">
        <div className="flex justify-between mb-2">
          <span className="font-medium">
            Profil Tamamlanma
          </span>

          <span className="font-semibold">
            %100
          </span>
        </div>

        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-full bg-green-500 rounded-full" />
        </div>
      </div>

      {/* Butonlar */}
      <div className="flex gap-4 mt-10">
        <button
          onClick={onBack}
          className="flex-1 border rounded-full py-4 font-semibold hover:bg-gray-100 transition"
        >
          Geri
        </button>

        <button
  onClick={() => {
    window.location.href = "/freelancers/dashboard";
  }}
  className="
    flex-1
    bg-black
    text-white
    rounded-full
    py-4
    font-semibold
    hover:bg-gray-800
    transition
  "
>
  Kayıt Tamamla
</button>
      </div>
    </>
  );
}