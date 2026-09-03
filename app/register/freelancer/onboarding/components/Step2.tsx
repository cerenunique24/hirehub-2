"use client";

import type { OnboardingData } from "../page";

type Step2Props = {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
  onBack: () => void;
  onNext: () => void;
};

export default function Step2({
  data,
  onChange,
  onBack,
  onNext,
}: Step2Props) {
  const handlePhoto = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    onChange({
      photo: file,
    });
  };

  const portfolioValid =
    data.portfolio === "" ||
    /^https?:\/\/.+/i.test(data.portfolio);

  const canContinue =
    data.photo !== null &&
    data.experience !== "" &&
    portfolioValid;

  const photoPreview = data.photo
    ? URL.createObjectURL(data.photo)
    : null;

  return (
    <>
      <h1 className="text-4xl font-bold">
        Portfolyo ve Deneyim
      </h1>

      <p className="text-gray-500 mt-3">
        Güçlü bir profil daha fazla iş almanı sağlar.
      </p>

      <div className="mt-10 space-y-8">

        <div>
          <label className="font-semibold">
            Profil Fotoğrafı
          </label>

          <div className="mt-4 flex items-center gap-6">

            <div className="w-32 h-32 rounded-full overflow-hidden border bg-gray-100">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  Fotoğraf
                </div>
              )}
            </div>

            <label className="cursor-pointer bg-black text-white px-6 py-3 rounded-full">
              Fotoğraf Yükle

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhoto}
              />
            </label>

          </div>
        </div>

        <div>
          <label className="font-semibold">
            Portfolyo Linki
          </label>

          <input
            value={data.portfolio}
            onChange={(e) =>
              onChange({
                portfolio: e.target.value,
              })
            }
            placeholder="https://behance.net/kullaniciadi"
            className="w-full border rounded-xl px-5 py-4 mt-3"
          />

          <p
            className={`mt-2 text-sm ${
              portfolioValid
                ? "text-gray-400"
                : "text-red-500"
            }`}
          >
            Behance, Dribbble, Github veya kişisel web sitesi ekleyebilirsin.
          </p>
        </div>

        <div>
          <label className="font-semibold">
            Deneyim Seviyesi
          </label>

          <select
            value={data.experience}
            onChange={(e) =>
              onChange({
                experience: e.target.value,
              })
            }
            className="w-full border rounded-xl px-5 py-4 mt-3"
          >
            <option value="">Seçiniz</option>
            <option value="junior">Junior (0-2 yıl)</option>
            <option value="mid">Mid-Level (2-5 yıl)</option>
            <option value="senior">Senior (5+ yıl)</option>
            <option value="lead">Lead / Principal</option>
          </select>
        </div>

        <div className="flex gap-4">

          <button
            onClick={onBack}
            className="flex-1 border rounded-full py-4 font-semibold"
          >
            Geri
          </button>

          <button
            disabled={!canContinue}
            onClick={onNext}
            className={`flex-1 rounded-full py-4 font-semibold ${
              canContinue
                ? "bg-black text-white"
                : "bg-gray-300 text-white cursor-not-allowed"
            }`}
          >
            Devam Et
          </button>

        </div>

      </div>
    </>
  );
}