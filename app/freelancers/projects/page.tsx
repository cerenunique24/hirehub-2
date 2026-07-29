export default function ProjectsPage() {
    return (
      <main className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Aktif Projelerim
          </h1>
  
          <p className="mt-2 text-sm text-gray-500">
            Devam eden ve tamamlanan projelerini buradan yönetebilirsin.
          </p>
        </div>
  
        {/* Filtreler */}
        <div className="flex gap-3 mb-8">
          <button className="px-5 py-2 rounded-full bg-black text-white text-sm">
            Tümü (12)
          </button>
  
          <button className="px-5 py-2 rounded-full bg-gray-100 text-gray-700 text-sm">
            Devam Eden (5)
          </button>
  
          <button className="px-5 py-2 rounded-full bg-gray-100 text-gray-700 text-sm">
            Tamamlanan (5)
          </button>
  
          <button className="px-5 py-2 rounded-full bg-gray-100 text-gray-700 text-sm">
            Geciken (2)
          </button>
        </div>
  
  
        {/* Proje Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
  
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-semibold text-gray-900">
                Mobil Uygulama Tasarımı
              </h2>
  
              <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700">
                Devam Ediyor
              </span>
            </div>
  
            <p className="text-sm text-gray-500 mb-5">
              Fintech uygulaması için UI/UX tasarım süreci.
            </p>
  
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Teslim:
              </span>
  
              <span className="font-medium">
                12 Ağustos
              </span>
            </div>
          </div>
  
  
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-semibold text-gray-900">
                E-Ticaret Web Tasarımı
              </h2>
  
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                Beklemede
              </span>
            </div>
  
            <p className="text-sm text-gray-500 mb-5">
              Marka sitesi ve kullanıcı deneyimi çalışması.
            </p>
  
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Teslim:
              </span>
  
              <span className="font-medium">
                25 Ağustos
              </span>
            </div>
          </div>
  
  
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-semibold text-gray-900">
                Dashboard Tasarımı
              </h2>
  
              <span className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700">
                Geciken
              </span>
            </div>
  
            <p className="text-sm text-gray-500 mb-5">
              SaaS yönetim paneli arayüz tasarımı.
            </p>
  
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Teslim:
              </span>
  
              <span className="font-medium">
                5 Ağustos
              </span>
            </div>
          </div>
  
        </div>
  
      </main>
    );
  }