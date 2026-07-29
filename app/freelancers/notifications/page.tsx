export default function NotificationsPage() {

    const notifications = [
      {
        title: "Teklifin kabul edildi",
        description:
          "Nova Teknoloji projesi için gönderdiğin teklif müşteri tarafından kabul edildi.",
        type: "Proje",
        date: "Bugün, 10:32",
        unread: true,
      },
      {
        title: "Yeni koalisyon daveti",
        description:
          "Mobil Uygulama Ekibi seni yeni bir koalisyona davet etti.",
        type: "Ekip",
        date: "Dün, 15:20",
        unread: true,
      },
      {
        title: "Ödeme tamamlandı",
        description:
          "SaaS Dashboard projesi için 45.000 TL ödeme hesabına aktarıldı.",
        type: "Finans",
        date: "25 Temmuz 2026",
        unread: false,
      },
      {
        title: "Proje teslim tarihi güncellendi",
        description:
          "Kurumsal Web Sitesi projesinin teslim tarihi değiştirildi.",
        type: "Sistem",
        date: "22 Temmuz 2026",
        unread: false,
      },
    ];
  
  
  
    return (
  
      <main className="p-8 w-full">
  
  
        {/* Başlık */}
  
        <div className="mb-8">
  
          <h1 className="text-2xl font-semibold text-gray-900">
            Bildirimler
          </h1>
  
          <p className="mt-2 text-sm text-gray-500">
            Projelerin, mesajların ve hesap hareketlerinle ilgili bildirimleri takip et.
          </p>
  
        </div>
  
  
  
  
  
        {/* Filtreler */}
  
        <div className="flex gap-3 mb-8">
  
  
          <button
            className="
              px-5
              py-2
              rounded-full
              bg-black
              text-white
              text-sm
            "
          >
            Tümü (12)
          </button>
  
  
  
          <button
            className="
              px-5
              py-2
              rounded-full
              bg-gray-100
              text-gray-700
              text-sm
            "
          >
            Okunmamış (3)
          </button>
  
  
  
          <button
            className="
              px-5
              py-2
              rounded-full
              bg-gray-100
              text-gray-700
              text-sm
            "
          >
            Proje
          </button>
  
  
  
          <button
            className="
              px-5
              py-2
              rounded-full
              bg-gray-100
              text-gray-700
              text-sm
            "
          >
            Sistem
          </button>
  
  
        </div>
  
  
  
  
  
  
  
        {/* Bildirim Listesi */}
  
        <div className="space-y-5 w-full">
  
  
  
          {notifications.map((notification,index)=>(
  
  
            <div
              key={index}
              className={`
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
  
                ${
                  notification.unread
                  ? "border-black/20"
                  : ""
                }
              `}
            >
  
  
  
              {/* Sol Alan */}
  
              <div className="flex-1">
  
  
                <div className="flex items-center gap-3 mb-3">
  
  
                  <h2
                    className="
                      text-lg
                      font-semibold
                      text-gray-900
                    "
                  >
                    {notification.title}
                  </h2>
  
  
  
                  <span
                    className={`
                      text-xs
                      px-3
                      py-1
                      rounded-full
  
                      ${
                        notification.type === "Finans"
                        ? "bg-green-100 text-green-700"
                        :
                        notification.type === "Ekip"
                        ? "bg-purple-100 text-purple-700"
                        :
                        notification.type === "Proje"
                        ? "bg-blue-100 text-blue-700"
                        :
                        "bg-gray-100 text-gray-700"
                      }
                    `}
                  >
                    {notification.type}
                  </span>
  
  
                  {
                    notification.unread && (
  
                      <span
                        className="
                          w-2
                          h-2
                          rounded-full
                          bg-black
                        "
                      />
  
                    )
                  }
  
  
                </div>
  
  
  
  
  
                <p
                  className="
                    text-sm
                    text-gray-500
                    mb-4
                  "
                >
                  {notification.description}
                </p>
  
  
  
  
                <span
                  className="
                    text-xs
                    text-gray-400
                  "
                >
                  {notification.date}
                </span>
  
  
  
              </div>
  
  
  
  
  
              {/* Aksiyon */}
  
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
                Görüntüle
              </button>
  
  
  
            </div>
  
  
          ))}
  
  
  
        </div>
  
  
  
      </main>
  
    );
  
  }