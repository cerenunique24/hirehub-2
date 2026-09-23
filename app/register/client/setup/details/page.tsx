"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Clock3,
  Loader2,
  MapPin,
  Wallet,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const expertiseOptions = [
  "Web Tasarım",
  "Web Geliştirme",
  "Mobil Uygulama",
  "UI/UX Tasarım",
  "Marka Tasarımı",
  "Grafik Tasarım",
  "E-Ticaret",
  "Yazılım Geliştirme",
  "Dijital Pazarlama",
  "İçerik Üretimi",
  "3D Tasarım",
  "Mimari & İç Mekân",
];

const durationOptions = [
  "1 haftadan kısa",
  "1 - 2 hafta",
  "2 - 4 hafta",
  "1 - 3 ay",
  "3 - 6 ay",
  "6 aydan uzun",
];

const budgetOptions = [
  {
    label: "0 - 10.000 TL",
    min: 0,
    max: 10000,
  },
  {
    label: "10.000 - 25.000 TL",
    min: 10000,
    max: 25000,
  },
  {
    label: "25.000 - 50.000 TL",
    min: 25000,
    max: 50000,
  },
  {
    label: "50.000 - 100.000 TL",
    min: 50000,
    max: 100000,
  },
  {
    label: "100.000 - 250.000 TL",
    min: 100000,
    max: 250000,
  },
  {
    label: "250.000 TL ve üzeri",
    min: 250000,
    max: 1000000,
  },
];

const countryOptions = [
  "Türkiye",
  "Almanya",
  "Amerika Birleşik Devletleri",
  "Birleşik Krallık",
  "Fransa",
  "Hollanda",
  "İspanya",
  "İtalya",
  "Birleşik Arap Emirlikleri",
];

const cityOptions: Record<string, string[]> = {
  Türkiye: [
    "Adana",
    "Adıyaman",
    "Afyonkarahisar",
    "Ağrı",
    "Aksaray",
    "Amasya",
    "Ankara",
    "Antalya",
    "Ardahan",
    "Artvin",
    "Aydın",
    "Balıkesir",
    "Bartın",
    "Batman",
    "Bayburt",
    "Bilecik",
    "Bingöl",
    "Bitlis",
    "Bolu",
    "Burdur",
    "Bursa",
    "Çanakkale",
    "Çankırı",
    "Çorum",
    "Denizli",
    "Diyarbakır",
    "Düzce",
    "Edirne",
    "Elazığ",
    "Erzincan",
    "Erzurum",
    "Eskişehir",
    "Gaziantep",
    "Giresun",
    "Gümüşhane",
    "Hakkari",
    "Hatay",
    "Iğdır",
    "Isparta",
    "İstanbul",
    "İzmir",
    "Kahramanmaraş",
    "Karabük",
    "Karaman",
    "Kars",
    "Kastamonu",
    "Kayseri",
    "Kilis",
    "Kırıkkale",
    "Kırklareli",
    "Kırşehir",
    "Kocaeli",
    "Konya",
    "Kütahya",
    "Malatya",
    "Manisa",
    "Mardin",
    "Mersin",
    "Muğla",
    "Muş",
    "Nevşehir",
    "Niğde",
    "Ordu",
    "Osmaniye",
    "Rize",
    "Sakarya",
    "Samsun",
    "Siirt",
    "Sinop",
    "Sivas",
    "Şanlıurfa",
    "Şırnak",
    "Tekirdağ",
    "Tokat",
    "Trabzon",
    "Tunceli",
    "Uşak",
    "Van",
    "Yalova",
    "Yozgat",
    "Zonguldak",
  ],

  Almanya: [
    "Berlin",
    "Hamburg",
    "Münih",
    "Frankfurt",
    "Köln",
    "Stuttgart",
    "Düsseldorf",
  ],

  "Amerika Birleşik Devletleri": [
    "New York",
    "Los Angeles",
    "Chicago",
    "San Francisco",
    "Miami",
    "Boston",
    "Seattle",
  ],

  "Birleşik Krallık": [
    "Londra",
    "Manchester",
    "Birmingham",
    "Liverpool",
    "Edinburgh",
  ],

  Fransa: [
    "Paris",
    "Lyon",
    "Marsilya",
    "Nice",
    "Bordeaux",
  ],

  Hollanda: [
    "Amsterdam",
    "Rotterdam",
    "Lahey",
    "Utrecht",
    "Eindhoven",
  ],

  İspanya: [
    "Madrid",
    "Barcelona",
    "Valencia",
    "Sevilla",
    "Malaga",
  ],

  İtalya: [
    "Roma",
    "Milano",
    "Floransa",
    "Venedik",
    "Napoli",
  ],

  "Birleşik Arap Emirlikleri": [
    "Dubai",
    "Abu Dabi",
    "Sharjah",
    "Ajman",
  ],
};

export default function ClientProjectDetailsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("");
  const [country, setCountry] = useState("Türkiye");
  const [city, setCity] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);

  useEffect(() => {
    const initializePage = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const savedProject = localStorage.getItem(
        "client_project_draft"
      );

      if (!savedProject) {
        router.replace("/client/projects/new");
        return;
      }

      try {
        const project = JSON.parse(savedProject);

        setBudget(project.budget || "");
        setDuration(project.duration || "");
        setCountry(project.country || "Türkiye");
        setCity(project.city || "");
        setExpertise(
          Array.isArray(project.expertise)
            ? project.expertise
            : []
        );
      } catch (parseError) {
        console.error(
          "Proje taslağı okunamadı:",
          parseError
        );

        router.replace("/client/projects/new");
        return;
      }

      setLoading(false);
    };

    initializePage();
  }, [router, supabase]);

  const toggleExpertise = (item: string) => {
    setExpertise((current) => {
      if (current.includes(item)) {
        return current.filter(
          (expertiseItem) => expertiseItem !== item
        );
      }

      return [...current, item];
    });
  };

  const handleCountryChange = (value: string) => {
    setCountry(value);

    const availableCities = cityOptions[value] || [];

    if (!availableCities.includes(city)) {
      setCity("");
    }
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setError("");

    if (!budget) {
      setError("Lütfen proje bütçesini seçin.");
      return;
    }

    if (!duration) {
      setError("Lütfen tahmini proje süresini seçin.");
      return;
    }

    if (!country) {
      setError("Lütfen proje ülkesini seçin.");
      return;
    }

    if (!city) {
      setError("Lütfen proje şehrini seçin.");
      return;
    }

    if (expertise.length === 0) {
      setError("Lütfen en az bir uzmanlık alanı seçin.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Oturum hatası:", userError);

        setError(
          "Oturum bilgilerinize ulaşılamadı. Lütfen tekrar giriş yapın."
        );

        setSubmitting(false);
        return;
      }

      const savedProject = localStorage.getItem(
        "client_project_draft"
      );

      if (!savedProject) {
        setError(
          "Proje bilgileri bulunamadı. Lütfen proje oluşturma adımına geri dönün."
        );

        setSubmitting(false);
        return;
      }

      let projectDraft: {
        projectName?: string;
        description?: string;
        category?: string;
      };

      try {
        projectDraft = JSON.parse(savedProject);
      } catch (parseError) {
        console.error("Taslak JSON hatası:", parseError);

        setError(
          "Proje taslağı okunamadı. Lütfen proje oluşturma adımına geri dönün."
        );

        setSubmitting(false);
        return;
      }

      if (
        !projectDraft.projectName?.trim() ||
        !projectDraft.description?.trim() ||
        !projectDraft.category?.trim()
      ) {
        setError(
          "Proje bilgileri eksik. Lütfen önceki adımı kontrol edin."
        );

        setSubmitting(false);
        return;
      }

      const selectedBudget = budgetOptions.find(
        (item) => item.label === budget
      );

      if (!selectedBudget) {
        setError("Seçilen bütçe aralığı geçersiz.");
        setSubmitting(false);
        return;
      }

      /*
       * ÖNEMLİ:
       * Önce projects tablosunda kesin olarak bulunması beklenen
       * temel alanlarla kayıt oluşturuyoruz.
       *
       * country, city, estimated_duration gibi sonradan eklenen
       * alanlar migration veritabanına uygulanmadıysa insert işlemini
       * tamamen bozabilir. Bu yüzden temel kayıt güvenli şekilde
       * oluşturulduktan sonra ekstra alanları ikinci aşamada ekliyoruz.
       */
      const projectData = {
        client_id: user.id,
        title: projectDraft.projectName.trim(),
        description: projectDraft.description.trim(),
        category: projectDraft.category.trim(),
        skills: expertise,
        budget_min: selectedBudget.min,
        budget_max: selectedBudget.max,
        status: "open",
      };

      console.log(
        "Supabase'e gönderilen proje verisi:",
        projectData
      );

      const {
        data: createdProject,
        error: insertError,
      } = await supabase
        .from("projects")
        .insert(projectData)
        .select()
        .single();

      if (insertError) {
        console.error("SUPABASE PROJE INSERT HATASI:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          fullError: insertError,
        });

        setError(
          insertError.message ||
            "Proje oluşturulurken bir hata meydana geldi."
        );

        setSubmitting(false);
        return;
      }

      if (!createdProject?.id) {
        console.error(
          "Proje oluşturuldu ancak proje ID'si alınamadı:",
          createdProject
        );

        setError(
          "Proje oluşturuldu ancak proje bilgisine ulaşılamadı."
        );

        setSubmitting(false);
        return;
      }

      /*
       * Ek proje bilgilerini ayrı bir UPDATE ile kaydetmeyi deniyoruz.
       * Migration henüz uygulanmamışsa ana proje kaydı silinmez.
       */
      const extraProjectData = {
        location: `${city}, ${country}`,
        country,
        city,
        estimated_duration: duration,
        budget: selectedBudget.max,
        project_type: projectDraft.category.trim(),
        requirements: [
          `Tahmini süre: ${duration}`,
          `Ülke: ${country}`,
          `Şehir: ${city}`,
        ],
        team_required: expertise.length > 1,
      };

      const { error: updateError } = await supabase
        .from("projects")
        .update(extraProjectData)
        .eq("id", createdProject.id);

      if (updateError) {
        console.warn(
          "Ek proje bilgileri kaydedilemedi. Ana proje başarıyla oluşturuldu:",
          {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code,
          }
        );
      }

      console.log(
        "Proje başarıyla oluşturuldu:",
        createdProject
      );

      localStorage.removeItem("client_project_draft");

      router.push(`/client/projects/${createdProject.id}`);
    } catch (submitError) {
      console.error("BEKLENMEYEN PROJE OLUŞTURMA HATASI:", submitError);

      const message =
        submitError instanceof Error
          ? submitError.message
          : "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.";

      setError(message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)]">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <Loader2
            className="animate-spin"
            size={28}
          />

          <p className="text-sm">
            Hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">

        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft size={18} />
            Geri
          </button>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary-600)] text-white">
            <BriefcaseBusiness size={20} />
          </div>

          <div className="w-[52px]" />
        </div>

        {/* Progress */}
        <div className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              Proje detayları
            </span>

            <span className="text-sm text-gray-500">
              Adım 2 / 2
            </span>
          </div>

          <div className="flex gap-2">
            <div className="h-2 flex-1 rounded-full bg-[var(--color-primary-600)]" />
            <div className="h-2 flex-1 rounded-full bg-[var(--color-primary-600)]" />
          </div>
        </div>

        {/* Page Title */}
        <div className="mb-10">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-600)] text-white">
            <BriefcaseBusiness size={25} />
          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.01em] text-neutral-900 sm:text-4xl">
            Proje detaylarını belirle.
          </h1>

          <p className="mt-3 max-w-xl text-base leading-7 text-gray-500">
            Bütçe, süre, konum ve ihtiyaç duyduğun
            uzmanlıkları belirleyerek projen için
            doğru freelancer ve ekiplerle eşleşebilirsin.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* Budget */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                <Wallet size={21} />
              </div>

              <div>
                <h2 className="font-bold text-neutral-900">
                  Proje bütçesi
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Projen için ayırmayı düşündüğün
                  bütçe aralığını seç.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-900">
                Bütçe aralığı
              </label>

              <select
                value={budget}
                onChange={(e) =>
                  setBudget(e.target.value)
                }
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary-600)] focus:ring-4 focus:ring-[var(--color-primary-600)]/5"
              >
                <option value="">
                  Bütçe aralığını seç
                </option>

                {budgetOptions.map((item) => (
                  <option
                    key={item.label}
                    value={item.label}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Duration */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                <Clock3 size={21} />
              </div>

              <div>
                <h2 className="font-bold text-neutral-900">
                  Tahmini proje süresi
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Projenin yaklaşık ne kadar sürede
                  tamamlanmasını bekliyorsun?
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-900">
                Proje süresi
              </label>

              <select
                value={duration}
                onChange={(e) =>
                  setDuration(e.target.value)
                }
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary-600)] focus:ring-4 focus:ring-[var(--color-primary-600)]/5"
              >
                <option value="">
                  Süre seç
                </option>

                {durationOptions.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Location */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                <MapPin size={21} />
              </div>

              <div>
                <h2 className="font-bold text-neutral-900">
                  Proje konumu
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Projenin gerçekleştirileceği ülke ve
                  şehri seç.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              {/* Country */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-900">
                  Ülke
                </label>

                <select
                  value={country}
                  onChange={(e) =>
                    handleCountryChange(e.target.value)
                  }
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary-600)] focus:ring-4 focus:ring-[var(--color-primary-600)]/5"
                >
                  <option value="">
                    Ülke seç
                  </option>

                  {countryOptions.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-900">
                  Şehir
                </label>

                <select
                  value={city}
                  onChange={(e) =>
                    setCity(e.target.value)
                  }
                  disabled={!country}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary-600)] focus:ring-4 focus:ring-[var(--color-primary-600)]/5 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">
                    Şehir seç
                  </option>

                  {(cityOptions[country] || []).map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>

          {/* Expertise */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                <Zap size={21} />
              </div>

              <div>
                <h2 className="font-bold text-neutral-900">
                  Hangi uzmanlıklara ihtiyacın var?
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Bir veya birden fazla uzmanlık alanı
                  seçebilirsin.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-900">
                Uzmanlık alanları
              </label>

              <div className="rounded-xl border border-gray-200 bg-white p-3">

                {/* Selected expertise */}
                <div className="mb-3 flex flex-wrap gap-2">
                  {expertise.length > 0 ? (
                    expertise.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          toggleExpertise(item)
                        }
                        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-600)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--color-primary-700)]"
                      >
                        <Check size={13} />
                        {item}
                      </button>
                    ))
                  ) : (
                    <span className="px-1 py-1 text-sm text-gray-400">
                      Uzmanlık alanı seç
                    </span>
                  )}
                </div>

                {/* Expertise options */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {expertiseOptions.map((item) => {
                      const selected =
                        expertise.includes(item);

                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            toggleExpertise(item)
                          }
                          className={
                            selected
                              ? "flex items-center justify-between rounded-lg bg-[var(--color-primary-600)] px-3 py-2.5 text-left text-sm text-white transition"
                              : "flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                          }
                        >
                          <span>{item}</span>

                          {selected && (
                            <Check size={16} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 border-t border-gray-200 pb-10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
            >
              <ArrowLeft size={17} />
              Geri
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Proje oluşturuluyor...
                </>
              ) : (
                <>
                  Projeyi oluştur
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
