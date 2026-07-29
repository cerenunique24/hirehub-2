export default function CreateProject() {
    return (
      <main className="min-h-screen bg-[#fafafa] px-6 py-20">
  
  
        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-10 shadow-sm">
  
  
          <h1 className="text-4xl font-bold">
            Yeni proje oluştur
          </h1>
  
  
          <p className="text-gray-500 mt-3">
            İhtiyacını anlat, doğru yeteneklerle eşleş.
          </p>
  
  
  
  
          <div className="mt-10 space-y-5">
  
  
            <input
              placeholder="Proje başlığı"
              className="w-full border rounded-xl px-5 py-4"
            />
  
  
  
            <select
              className="w-full border rounded-xl px-5 py-4"
            >
  
              <option>
                Kategori seç
              </option>
  
              <option>
                UI/UX Tasarım
              </option>
  
              <option>
                Yazılım
              </option>
  
              <option>
                3D Tasarım
              </option>
  
              <option>
                Dijital Pazarlama
              </option>
  
            </select>
  
  
  
  
            <textarea
              placeholder="Projenizi detaylı anlatın"
              rows={6}
              className="w-full border rounded-xl px-5 py-4"
            />
  
  
  
            <select
              className="w-full border rounded-xl px-5 py-4"
            >
  
              <option>
                Bütçe aralığı
              </option>
  
              <option>
                5.000 TL altı
              </option>
  
              <option>
                5.000 - 25.000 TL
              </option>
  
              <option>
                25.000 - 100.000 TL
              </option>
  
              <option>
                100.000 TL üzeri
              </option>
  
            </select>
  
  
  
  
            <select
              className="w-full border rounded-xl px-5 py-4"
            >
  
              <option>
                Teslim süresi
              </option>
  
              <option>
                1 hafta içinde
              </option>
  
              <option>
                1 ay içinde
              </option>
  
              <option>
                3 ay içinde
              </option>
  
            </select>
  
  
  
  
            <button
              className="w-full bg-black text-white py-4 rounded-full mt-4"
            >
              Projeyi Yayınla
            </button>
  
  
          </div>
  
  
        </div>
  
  
      </main>
    );
  }