export default function SettingsPage() {

    const notifications = [
      "Yeni mesaj bildirimleri",
      "Yeni teklif bildirimleri",
      "Koalisyon davetleri",
      "Ödeme güncellemeleri",
    ];
  
  
    return (
  
      <main className="p-8 w-full">
  
  
        {/* Başlık */}
  
        <div className="mb-8">
  
          <h1 className="text-2xl font-semibold text-gray-900">
            Ayarlar
          </h1>
  
          <p className="mt-2 text-sm text-gray-500">
            Hesap, güvenlik ve platform tercihlerini yönet.
          </p>
  
        </div>
  
  
  
  
  
        {/* Hesap Bilgileri */}
  
        <section className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          p-6
          mb-6
        ">
  
          <h2 className="text-lg font-semibold mb-5">
            Hesap Bilgileri
          </h2>
  
  
  
          <div className="
            grid
            md:grid-cols-2
            gap-5
          ">
  
  
            {[
              ["Ad Soyad","Ceren Koçyiğit"],
              ["E-posta","ceren@email.com"],
              ["Telefon","+90 555 000 00 00"],
              ["Dil","Türkçe"],
            ].map((item,index)=>(
  
  
              <div key={index}>
  
                <label className="text-sm text-gray-500">
                  {item[0]}
                </label>
  
                <input
                  value={item[1]}
                  readOnly
                  className="
                    mt-2
                    w-full
                    px-4
                    py-3
                    rounded-xl
                    bg-gray-100
                    text-sm
                  "
                />
  
              </div>
  
  
            ))}
  
  
  
          </div>
  
  
        </section>
  
  
  
  
  
  
  
  
  
        {/* Kimlik Doğrulama */}
  
        <section className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          p-6
          mb-6
        ">
  
  
          <h2 className="text-lg font-semibold mb-5">
            Kimlik Doğrulama
          </h2>
  
  
  
          <div className="
            flex
            justify-between
            items-center
          ">
  
  
            <div>
  
  
              <p className="text-sm text-gray-500">
                Kimlik Durumu
              </p>
  
  
              <p className="
                mt-1
                font-medium
                text-green-600
              ">
                ✓ Doğrulandı
              </p>
  
  
              <p className="text-sm mt-3">
                TC Kimlik No
              </p>
  
  
              <p className="text-gray-500">
                ***********
              </p>
  
  
            </div>
  
  
  
  
            <button
              className="
                px-5
                py-2.5
                rounded-xl
                bg-gray-100
                text-sm
              "
            >
              Görüntüle
            </button>
  
  
  
          </div>
  
  
        </section>
  
  
  
  
  
  
  
  
  
        {/* Bildirimler */}
  
        <section className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          p-6
          mb-6
        ">
  
  
          <h2 className="text-lg font-semibold mb-5">
            Bildirim Tercihleri
          </h2>
  
  
  
          {notifications.map((item,index)=>(
  
  
            <div
              key={index}
              className="
                flex
                justify-between
                items-center
                py-4
                border-b
                border-gray-100
                last:border-none
              "
            >
  
  
              <span className="text-sm">
                {item}
              </span>
  
  
              <div
                className="
                  w-11
                  h-6
                  bg-black
                  rounded-full
                  relative
                "
              >
  
                <div
                  className="
                    absolute
                    right-1
                    top-1
                    w-4
                    h-4
                    bg-white
                    rounded-full
                  "
                />
  
              </div>
  
  
            </div>
  
  
          ))}
  
  
  
        </section>
  
  
  
  
  
  
  
  
  
        {/* Ödeme */}
  
        <section className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          p-6
          mb-6
        ">
  
  
          <h2 className="text-lg font-semibold mb-5">
            Ödeme ve Finans
          </h2>
  
  
  
          <div className="
            flex
            justify-between
            items-center
          ">
  
  
            <div>
  
  
              <p className="text-sm text-gray-500">
                Banka Hesabı
              </p>
  
  
              <p className="font-medium mt-1">
                TR •••• 4582
              </p>
  
  
  
              <p className="
                text-sm
                text-gray-500
                mt-4
              ">
                Fatura Tipi
              </p>
  
  
              <p className="font-medium">
                Bireysel
              </p>
  
  
            </div>
  
  
  
            <button
              className="
                px-5
                py-2.5
                rounded-xl
                bg-gray-100
                text-sm
              "
            >
              Düzenle
            </button>
  
  
          </div>
  
  
        </section>
  
  
  
  
  
  
  
  
  
        {/* Güvenlik */}
  
        <section className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          p-6
          mb-6
        ">
  
  
          <h2 className="text-lg font-semibold mb-5">
            Güvenlik
          </h2>
  
  
  
          <div className="space-y-4">
  
  
            <button
              className="
                w-full
                flex
                justify-between
                items-center
                p-4
                rounded-xl
                bg-gray-100
                text-sm
              "
            >
  
              Şifre Değiştir
  
              <span>
                →
              </span>
  
            </button>
  
  
  
            <button
              className="
                w-full
                flex
                justify-between
                items-center
                p-4
                rounded-xl
                bg-gray-100
                text-sm
              "
            >
  
              İki Aşamalı Doğrulama
  
              <span>
                Kapalı
              </span>
  
            </button>
  
  
  
          </div>
  
  
        </section>
  
  
  
  
  
  
  
  
  
        {/* Profil Görünürlüğü */}
  
        <section className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          p-6
          mb-6
        ">
  
  
          <h2 className="text-lg font-semibold mb-5">
            Profil Görünürlüğü
          </h2>
  
  
          <div className="space-y-3">
  
  
            {[
              "Herkese açık profil",
              "Sadece müşterilere göster",
              "Gizli profil",
            ].map((item,index)=>(
  
  
              <div
                key={index}
                className="
                  flex
                  gap-3
                  items-center
                  text-sm
                "
              >
  
                <input
                  type="radio"
                  defaultChecked={index===0}
                />
  
                {item}
  
              </div>
  
  
            ))}
  
  
  
          </div>
  
  
        </section>
  
  
  
  
  
  
  
  
  
        {/* Hesap Durumu */}
  
        <section className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          p-6
        ">
  
  
          <h2 className="text-lg font-semibold mb-5">
            Hesap Durumu
          </h2>
  
  
  
          <div className="space-y-3 text-sm">
  
  
            <p>
              Freelancer Seviyesi:
              <span className="font-medium ml-2">
                Profesyonel
              </span>
            </p>
  
  
            <p>
              Profil Tamamlama:
              <span className="font-medium ml-2">
                %92
              </span>
            </p>
  
  
            <button
              className="
                mt-4
                text-red-500
                text-sm
              "
            >
              Hesabı Kapat
            </button>
  
  
          </div>
  
  
        </section>
  
  
  
      </main>
  
    );
  
  }