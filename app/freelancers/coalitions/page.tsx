export default function CoalitionsPage() {
    const coalitions = [
        {
          title: "Mobil Uygulama Projesi",
          client: "Nova Teknoloji",
          members: [
            {
              name: "Ayşe",
              image: "/avatars/avatar-1.jpg",
            },
            {
              name: "Mehmet",
              image: "/avatars/avatar-2.jpg",
            },
            {
              name: "Ceren",
              image: "/avatars/avatar-3.jpg",
            },
          ],
          count: "3 kişi",
          date: "12 Temmuz 2026",
          status: "Aktif",
        },
      ];
  
  
    return (
      <main className="p-8 w-full">
  
  
        {/* Başlık */}
        <div className="mb-8">
  
          <h1 className="text-2xl font-semibold text-gray-900">
            Koalisyonlar
          </h1>
  
          <p className="mt-2 text-sm text-gray-500">
            Ekiplerinle oluşturduğun iş birliklerini ve ortak projeleri yönet.
          </p>
  
        </div>
  
  
  
        {/* Filtreler */}
        <div className="flex gap-3 mb-8">
  
          <button className="px-5 py-2 rounded-full bg-black text-white text-sm">
            Tümü (8)
          </button>
  
          <button className="px-5 py-2 rounded-full bg-gray-100 text-gray-700 text-sm">
            Aktif (5)
          </button>
  
          <button className="px-5 py-2 rounded-full bg-gray-100 text-gray-700 text-sm">
            Davetler (2)
          </button>
  
          <button className="px-5 py-2 rounded-full bg-gray-100 text-gray-700 text-sm">
            Tamamlanan (1)
          </button>
  
        </div>
  
  
  
  
  
        {/* Koalisyon Listesi */}
        <div className="space-y-5 w-full">
  
  
          {coalitions.map((coalition, index) => (
  
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
                    {coalition.title}
                  </h2>
  
  
                  <span
                    className={`
                      text-xs
                      px-3
                      py-1
                      rounded-full
  
                      ${
                        coalition.status === "Aktif"
                          ? "bg-green-100 text-green-700"
                          : coalition.status === "Davet Bekliyor"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    `}
                  >
                    {coalition.status}
                  </span>
  
  
                </div>
  
  
  
                <p className="text-sm text-gray-500 mb-5">
                  {coalition.client}
                </p>
  
  
  
  
                <div className="flex gap-10 text-sm">
  
  
                  <div>
  
                    <span className="block text-gray-400 mb-1">
                      Ekip
                    </span>
  
  
                    <div className="flex items-center">

{coalition.members.map((member, index) => (
  <div
    key={index}
    className="
      relative
      -ml-2
      first:ml-0
      group
    "
  >

    <img
      src={member.image}
      alt={member.name}
      className="
        w-9
        h-9
        rounded-full
        border-2
        border-white
        object-cover
      "
    />


    <div
      className="
        absolute
        hidden
        group-hover:block
        bottom-12
        left-1/2
        -translate-x-1/2
        bg-black
        text-white
        text-xs
        px-2
        py-1
        rounded-lg
        whitespace-nowrap
      "
    >
      {member.name}
    </div>

  </div>
))}


</div>
  
                  </div>
  
  
  
  
                  <div>
  
                    <span className="block text-gray-400 mb-1">
                      Üye Sayısı
                    </span>
  
  
                    <span className="font-medium text-gray-900">
                      {coalition.count}
                    </span>
  
                  </div>
  
  
  
  
                  <div>
  
                    <span className="block text-gray-400 mb-1">
                      Başlangıç
                    </span>
  
  
                    <span className="font-medium text-gray-900">
                      {coalition.date}
                    </span>
  
                  </div>
  
  
                </div>
  
  
              </div>
  
  
  
  
  
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
                Detayları Gör
              </button>
  
  
  
            </div>
  
          ))}
  
  
  
        </div>
  
  
      </main>
    );
  }