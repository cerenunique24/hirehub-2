export default function ClientRegister() {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fafafa] px-6">
  
        <div className="bg-white rounded-3xl shadow-sm p-10 w-full max-w-xl">
  
          <h1 className="text-3xl font-bold">
            Hesap oluştur
          </h1>
  
          <p className="text-gray-500 mt-3">
            Projelerini yayınlamak için ücretsiz kayıt ol.
          </p>
  
          <div className="mt-8 space-y-4">
  
            <input
              placeholder="Ad Soyad"
              className="w-full border rounded-xl px-5 py-4"
            />
  
            <input
              placeholder="E-posta"
              type="email"
              className="w-full border rounded-xl px-5 py-4"
            />
  
            <input
              placeholder="Telefon numarası"
              className="w-full border rounded-xl px-5 py-4"
            />
  
            <input
              placeholder="Şifre"
              type="password"
              className="w-full border rounded-xl px-5 py-4"
            />
  
            <input
              placeholder="Şifre tekrar"
              type="password"
              className="w-full border rounded-xl px-5 py-4"
            />
  
            <label className="flex gap-3 text-sm text-gray-500">
              <input type="checkbox" />
              Kullanım koşullarını kabul ediyorum.
            </label>
  
            <button className="w-full bg-black text-white py-4 rounded-full mt-4">
              Hesap Oluştur
            </button>
  
          </div>
  
        </div>
  
      </main>
    );
  }