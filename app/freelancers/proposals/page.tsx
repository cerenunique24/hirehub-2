export default function OffersPage() {
    const offers = [
      {
        title: "Mobil Uygulama UI Tasarımı",
        client: "Nova Teknoloji",
        category: "UI/UX Tasarım",
        price: "35.000 TL",
        date: "28 Temmuz 2026",
        status: "Bekleyen",
      },
      {
        title: "Kurumsal Web Sitesi Tasarımı",
        client: "Porta Yapı",
        category: "Web Tasarım",
        price: "25.000 TL",
        date: "22 Temmuz 2026",
        status: "Kabul Edildi",
      },
      {
        title: "SaaS Dashboard Tasarımı",
        client: "Cloudify",
        category: "Product Design",
        price: "45.000 TL",
        date: "15 Temmuz 2026",
        status: "Reddedildi",
      },
    ];
  
  
    return (
      <main className="p-8 w-full">
  
        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Tekliflerim
          </h1>
  
          <p className="mt-2 text-sm text-gray-500">
            Gönderdiğin teklifleri ve proje süreçlerini takip et.
          </p>
        </div>
  
  
  
        {/* Filtreler */}
        <div className="flex gap-3 mb-8">
  
          <button className="px-5 py-2 rounded-full bg-black text-white text-sm">
            Tümü (18)
          </button>
  
          <button className="px-5 py-2 rounded-full bg-gray-100 text-gray-700 text-sm">
            Bekleyen (8)
          </button>
  
          <button className="px-5 py-2 rounded-full bg-gray-100 text-gray-700 text-sm">
            Kabul Edilen (6)
          </button>
  
          <button className="px-5 py-2 rounded-full bg-gray-100 text-gray-700 text-sm">
            Reddedilen (4)
          </button>
  
        </div>
  
  
  
  
        {/* Teklif Listesi */}
        <div className="space-y-5 w-full">
  
  
          {offers.map((offer, index) => (
  
            <div
              key={index}
              className="
                w-full
                bg-white
                border
                border-gray-200
                rounded-2xl
                p-6
                flex
                justify-between
                items-center
                gap-6
              "
            >
  
              {/* Sol Alan */}
              <div className="flex-1">
  
  
                <div className="flex items-center gap-3 mb-3">
  
                  <h2 className="text-lg font-semibold text-gray-900">
                    {offer.title}
                  </h2>
  
  
                  <span
                    className={`
                      text-xs
                      px-3
                      py-1
                      rounded-full
  
                      ${
                        offer.status === "Bekleyen"
                          ? "bg-yellow-100 text-yellow-700"
                          : offer.status === "Kabul Edildi"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }
                    `}
                  >
                    {offer.status}
                  </span>
  
                </div>
  
  
  
                <p className="text-sm text-gray-500 mb-5">
                  {offer.category}
                </p>
  
  
  
  
                <div className="flex gap-10 text-sm">
  
  
                  <div>
                    <span className="block text-gray-400 mb-1">
                      Müşteri
                    </span>
  
                    <span className="font-medium text-gray-900">
                      {offer.client}
                    </span>
                  </div>
  
  
  
                  <div>
                    <span className="block text-gray-400 mb-1">
                      Teklif Tutarı
                    </span>
  
                    <span className="font-medium text-gray-900">
                      {offer.price}
                    </span>
                  </div>
  
  
  
                  <div>
                    <span className="block text-gray-400 mb-1">
                      Gönderim Tarihi
                    </span>
  
                    <span className="font-medium text-gray-900">
                      {offer.date}
                    </span>
                  </div>
  
  
                </div>
  
  
              </div>
  
  
  
  
  
              {/* Buton */}
              <button
                className="
                  px-5
                  py-2.5
                  rounded-xl
                  bg-gray-100
                  text-sm
                  font-medium
                  text-gray-700
                  hover:bg-gray-200
                  transition
                "
              >
                Teklifi Gör
              </button>
  
  
            </div>
  
          ))}
  
  
        </div>
  
  
      </main>
    );
  }