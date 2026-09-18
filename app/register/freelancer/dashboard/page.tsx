"use client";

import Link from "next/link";

export default function FreelancerDashboard() {
  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-7xl px-8 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold">Hoş Geldin 👋</h1>
          <p className="mt-2 text-gray-500">
            Profilini tamamlayarak daha fazla müşteriye ulaşabilirsin.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 space-y-8 lg:col-span-8">
            <div className="rounded-3xl bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Profil Tamamlanma</h2>
                <span className="font-bold">%45</span>
              </div>

              <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full w-[45%] rounded-full bg-black" />
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border p-5">📷 Profil Fotoğrafı</div>
                <div className="rounded-2xl border p-5">🌍 Konum</div>
                <div className="rounded-2xl border p-5">💼 Portfolyo</div>
                <div className="rounded-2xl border p-5">⭐ İlk Hizmet</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <StatCard label="Profil Görüntülenmesi" value="0" />
              <StatCard label="Teklifler" value="0" />
              <StatCard label="Aktif Projeler" value="0" />
              <StatCard label="Değerlendirme" value="0.0" />
            </div>
          </div>

          <div className="col-span-12 space-y-6 lg:col-span-4">
            <div className="rounded-3xl bg-white p-8 shadow-sm">
              <h2 className="text-xl font-semibold">Hızlı İşlemler</h2>
              <div className="mt-6 space-y-4">
                <Link
                  href="/freelancers/discover"
                  className="block rounded-xl bg-black py-3 text-center text-white"
                >
                  + Projeleri Keşfet
                </Link>
                <Link
                  href="/freelancers/profile"
                  className="block rounded-xl border py-3 text-center"
                >
                  Profili Düzenle
                </Link>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold">CollaCrew Önerileri</h2>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-8 shadow-sm">
      <p className="text-gray-500">{label}</p>
      <h2 className="mt-4 text-5xl font-bold">{value}</h2>
    </div>
  );
}
