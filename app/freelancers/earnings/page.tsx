export default function EarningsPage() {

    const earnings = [
      {
        title: "Mobil Uygulama Tasarımı",
        client: "Nova Teknoloji",
        amount: "35.000 TL",
        date: "28 Temmuz 2026",
        status: "Ödendi",
      },
      {
        title: "Kurumsal Web Sitesi",
        client: "Porta Yapı",
        amount: "25.000 TL",
        date: "22 Temmuz 2026",
        status: "Bekleyen",
      },
      {
        title: "SaaS Dashboard Tasarımı",
        client: "Cloudify",
        amount: "45.000 TL",
        date: "15 Temmuz 2026",
        status: "Ödendi",
      },
    ];
  
  
    return (
      <main className="p-8 w-full">
  
  
        {/* Başlık */}
        <div className="mb-8">
  
          <h1 className="text-2xl font-semibold text-gray-900">
            Kazançlar
          </h1>
  
          <p className="mt-2 text-sm text-gray-500">
            Projelerden elde ettiğin gelirleri ve ödeme durumlarını takip et.
          </p>
  
        </div>
  
  
  
  
  
        {/* Özet Kartları */}
  
        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-5
            mb-8
          "
        >
  
  
          {/* Toplam Kazanç */}
  
          <div
            className="
              bg-white
              border
              border-gray-200
              rounded-2xl
              p-6
            "
          >
  
            <p className="text-sm text-gray-500">
              Toplam Kazanç
            </p>
  
            <h2 className="text-2xl font-semibold mt-2 text-black">
              105.000 TL
            </h2>
  
          </div>
  
  
  
  
          {/* Bekleyen */}
  
          <div
            className="
              bg-white
              border
              border-gray-200
              rounded-2xl
              p-6
            "
          >
  
            <p className="text-sm text-gray-500">
              Bekleyen Ödeme
            </p>
  
            <h2 className="text-2xl font-semibold mt-2 text-orange-500">
              25.000 TL
            </h2>
  
          </div>
  
  
  
  
          {/* Çekilebilir */}
  
          <div
            className="
              bg-white
              border
              border-gray-200
              rounded-2xl
              p-6
            "
          >
  
            <p className="text-sm text-gray-500">
              Çekilebilir Bakiye
            </p>
  
            <h2 className="text-2xl font-semibold mt-2 text-green-600">
              80.000 TL
            </h2>
  
          </div>
  
  
        </div>
  
  
  
  
  
  
        {/* Kazanç Geçmişi */}
  
        <div className="space-y-5 w-full">
  
  
          {earnings.map((item, index) => (
  
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
  
  
                <div className="flex items-center gap-3 mb-4">
  
  
                  <h2
                    className="
                      text-lg
                      font-semibold
                      text-gray-900
                    "
                  >
                    {item.title}
                  </h2>
  
  
  
                  <span
                    className={`
                      text-xs
                      px-3
                      py-1
                      rounded-full
  
                      ${
                        item.status === "Ödendi"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                      }
                    `}
                  >
                    {item.status}
                  </span>
  
  
                </div>
  
  
  
  
                <div
                  className="
                    flex
                    gap-10
                    text-sm
                  "
                >
  
  
                  <div>
  
                    <span className="block text-gray-400 mb-1">
                      Müşteri
                    </span>
  
                    <span className="font-medium text-gray-900">
                      {item.client}
                    </span>
  
                  </div>
  
  
  
  
                  <div>
  
                    <span className="block text-gray-400 mb-1">
                      Tutar
                    </span>
  
                    <span className="font-medium text-gray-900">
                      {item.amount}
                    </span>
  
                  </div>
  
  
  
  
                  <div>
  
                    <span className="block text-gray-400 mb-1">
                      Tarih
                    </span>
  
                    <span className="font-medium text-gray-900">
                      {item.date}
                    </span>
  
                  </div>
  
  
                </div>
  
  
              </div>
  
  
  
  
  
              {/* Buton */}
  
              <button
                className="
                  shrink-0
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
                Detay
              </button>
  
  
            </div>
  
          ))}
  
  
        </div>
  
  
      </main>
    );
  }