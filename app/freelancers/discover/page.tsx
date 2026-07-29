import {
  Search,
  ChevronDown,
  MapPin,
  Clock3,
  Briefcase,
  Heart,
} from "lucide-react";

const jobs = [
  {
    title: "UI/UX Designer",
    company: "Codeway",
    budget: "₺35.000",
    location: "Remote",
    type: "Proje Bazlı",
    date: "2 gün önce",
    tags: ["Figma", "UX", "Dashboard", "Mobile"],
  },
  {
    title: "Product Designer",
    company: "Getir",
    budget: "₺42.000",
    location: "Hybrid",
    type: "Tam Zamanlı",
    date: "Bugün",
    tags: ["Design System", "Research", "Figma"],
  },
  {
    title: "Frontend UI Designer",
    company: "HireHub",
    budget: "₺28.000",
    location: "Remote",
    type: "Freelance",
    date: "1 gün önce",
    tags: ["React", "Next.js", "Tailwind"],
  },
];

export default function DiscoverPage() {
  return (
    <div className="space-y-8">

      {/* Başlık */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Projeleri Keşfet
        </h1>

        <p className="mt-2 text-gray-500">
          Sana uygun projeleri keşfet ve hemen teklif gönder.
        </p>
      </div>

      {/* Arama */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex gap-4">

          <div className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
            <Search size={18} className="text-gray-400" />

            <input
              placeholder="Proje, teknoloji veya şirket ara..."
              className="w-full outline-none"
            />
          </div>

          <button className="rounded-xl bg-black px-8 text-white hover:bg-gray-800">
            Ara
          </button>

        </div>

        {/* Filtreler */}
        <div className="mt-5 flex flex-wrap gap-3">

          {[
            "Kategori",
            "Bütçe",
            "Süre",
            "Remote",
            "Deneyim",
            "Sırala",
          ].map((item) => (
            <button
              key={item}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm hover:bg-gray-100"
            >
              {item}
              <ChevronDown size={16} />
            </button>
          ))}

        </div>

      </div>

      {/* Sonuç Sayısı */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-black">128</span> proje bulundu
        </p>

        <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-100">
          En Yeni
        </button>
      </div>

      {/* Kartlar */}
      <div className="space-y-5">

        {jobs.map((job) => (
          <div
            key={job.title}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="flex justify-between">

              <div>

                <h2 className="text-xl font-semibold">
                  {job.title}
                </h2>

                <p className="mt-1 text-gray-500">
                  {job.company}
                </p>

              </div>

              <button className="rounded-full p-2 hover:bg-gray-100">
                <Heart size={20} />
              </button>

            </div>

            <div className="mt-5 flex flex-wrap gap-6 text-sm text-gray-600">

              <div className="flex items-center gap-2">
                <Briefcase size={16} />
                {job.type}
              </div>

              <div className="flex items-center gap-2">
                <MapPin size={16} />
                {job.location}
              </div>

              <div className="flex items-center gap-2">
                💰 {job.budget}
              </div>

              <div className="flex items-center gap-2">
                <Clock3 size={16} />
                {job.date}
              </div>

            </div>

            <div className="mt-5 flex flex-wrap gap-2">

              {job.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                >
                  {tag}
                </span>
              ))}

            </div>

            <p className="mt-5 text-gray-600 leading-7">
              Modern SaaS ürünümüz için deneyimli bir UI/UX Designer arıyoruz.
              Dashboard tasarımı, tasarım sistemi ve responsive web deneyimi
              konusunda tecrübeli freelancerlarla çalışmak istiyoruz.
            </p>

            <div className="mt-6 flex justify-end gap-3">

              <button className="rounded-xl border border-gray-200 px-5 py-3 hover:bg-gray-100">
                Detay
              </button>

              <button className="rounded-xl bg-black px-6 py-3 text-white hover:bg-gray-800">
                Teklif Ver
              </button>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}