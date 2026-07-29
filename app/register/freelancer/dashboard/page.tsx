"use client";

import Link from "next/link";

export default function FreelancerDashboard() {
  return (
    <main className="min-h-screen bg-[#f7f7f7]">

      <div className="max-w-7xl mx-auto px-8 py-10">

        <div className="mb-10">

          <h1 className="text-4xl font-bold">
            Hoş Geldin 👋
          </h1>

          <p className="text-gray-500 mt-2">
            Profilini tamamlayarak daha fazla müşteriye ulaşabilirsin.
          </p>

        </div>

        <div className="grid grid-cols-12 gap-8">

          {/* Sol Alan */}

          <div className="col-span-8 space-y-8"></div>            <div className="bg-white rounded-3xl p-8 shadow-sm">

<div className="flex justify-between items-center">

  <h2 className="text-2xl font-semibold">
    Profil Tamamlanma
  </h2>

  <span className="font-bold">
    %45
  </span>

</div>

<div className="w-full h-3 rounded-full bg-gray-200 mt-6 overflow-hidden">

  <div className="bg-black h-full w-[45%] rounded-full"></div>

</div>

<div className="grid grid-cols-2 gap-4 mt-8">

  <div className="border rounded-2xl p-5">

    📷 Profil Fotoğrafı

  </div>

  <div className="border rounded-2xl p-5">

    🌍 Konum

  </div>

  <div className="border rounded-2xl p-5">

    💼 Portfolyo

  </div>

  <div className="border rounded-2xl p-5">

    ⭐ İlk Hizmet

  </div>

</div>

</div>

<div className="grid grid-cols-2 gap-6">

<div className="bg-white rounded-3xl p-8 shadow-sm">

  <p className="text-gray-500">
    Profil Görüntülenmesi
  </p>

  <h2 className="text-5xl font-bold mt-4">
    0
  </h2>

</div>

<div className="bg-white rounded-3xl p-8 shadow-sm">

  <p className="text-gray-500">
    Teklifler
  </p>

  <h2 className="text-5xl font-bold mt-4">
    0
  </h2>

</div>

<div className="bg-white rounded-3xl p-8 shadow-sm">

  <p className="text-gray-500">
    Aktif Projeler
  </p>

  <h2 className="text-5xl font-bold mt-4">
    0
  </h2>

</div>

<div className="bg-white rounded-3xl p-8 shadow-sm">

  <p className="text-gray-500">
    Değerlendirme
  </p>

  <h2 className="text-5xl font-bold mt-4">
    0.0
  </h2>

</div>

</div>

</div>

{/* Sağ Alan */}

<div className="col-span-4 space-y-6">

  <div className="bg-white rounded-3xl p-8 shadow-sm">

    <h2 className="text-xl font-semibold">

      Hızlı İşlemler

    </h2>

    <div className="space-y-4 mt-6">

      <Link
        href="#"
        className="block bg-black text-white text-center rounded-xl py-3"
      >
        + Hizmet Oluştur
      </Link>

      <Link
        href="#"
        className="block border rounded-xl py-3 text-center"
      >
        Portfolyo Yükle
      </Link>

      <Link
        href="#"
        className="block border rounded-xl py-3 text-center"
      >
        Profili Düzenle
      </Link>

    </div>

  </div>

  <div className="bg-white rounded-3xl p-8 shadow-sm">

    <h2 className="text-xl font-semibold mb-6">

      HireHub Önerileri

    </h2>

    <div className="space-y-4 text-gray-600">

      <p>✅ Profil fotoğrafı ekle</p>

      <p>✅ Portfolyo yükle</p>

      <p>✅ İlk hizmetini oluştur</p>

      <p>✅ Sosyal medya hesaplarını bağla</p>

    </div>

  </div>

</div>

</div>

</div>

</main>
);
}