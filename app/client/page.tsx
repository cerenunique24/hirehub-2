import { Input } from "@/components/ui/Input";
export default function ClientRegister() {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-canvas)] px-6">

        <div className="bg-white rounded-[var(--radius-card)] shadow-sm p-10 w-full max-w-xl">

          <h1 className="cc-page-title font-semibold">
            Hesap oluştur
          </h1>

          <p className="text-[var(--color-text-secondary)] mt-3">
            Projelerini yayınlamak için ücretsiz kayıt ol.
          </p>

          <div className="mt-8 space-y-4">

            <Input
              placeholder="Ad Soyad"
              className="w-full border rounded-[var(--radius-card)] px-5 py-4"
            />

            <Input
              placeholder="E-posta"
              type="email"
              className="w-full border rounded-[var(--radius-card)] px-5 py-4"
            />

            <Input
              placeholder="Telefon numarası"
              className="w-full border rounded-[var(--radius-card)] px-5 py-4"
            />

            <Input
              placeholder="Şifre"
              type="password"
              className="w-full border rounded-[var(--radius-card)] px-5 py-4"
            />

            <Input
              placeholder="Şifre tekrar"
              type="password"
              className="w-full border rounded-[var(--radius-card)] px-5 py-4"
            />

            <label className="flex gap-3 text-sm text-[var(--color-text-secondary)]">
              <input type="checkbox" />
              Kullanım koşullarını kabul ediyorum.
            </label>

            <button className="w-full bg-[var(--color-primary-600)] text-white py-4 rounded-full mt-4">
              Hesap Oluştur
            </button>

          </div>

        </div>

      </main>
    );
}
