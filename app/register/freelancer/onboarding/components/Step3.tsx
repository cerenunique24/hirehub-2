"use client";

import { useState } from "react";

type Step3Props = {
  onBack: () => void;
  onNext: () => void;
};

export default function Step3({
  onBack,
  onNext,
}: Step3Props) {
  const [availability, setAvailability] = useState("");
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);

  const workOptions = [
    "Uzaktan",
    "Hibrit",
    "Yerinde",
  ];

  const languageOptions = [
    "Türkçe",
    "İngilizce",
    "Almanca",
    "Fransızca",
  ];

  const toggleWork = (item: string) => {
    if (workTypes.includes(item)) {
      setWorkTypes(workTypes.filter((x) => x !== item));
    } else {
      setWorkTypes([...workTypes, item]);
    }
  };

  const toggleLanguage = (item: string) => {
    if (languages.includes(item)) {
      setLanguages(languages.filter((x) => x !== item));
    } else {
      setLanguages([...languages, item]);
    }
  };

  const canContinue =
    availability !== "" &&
    workTypes.length > 0 &&
    languages.length > 0;

  return (
    <>

      <h1 className="text-4xl font-bold">
        Çalışma Tercihlerin
      </h1>

      <p className="text-gray-500 mt-3">
        Sana en uygun projeleri önerebilmemiz için birkaç bilgiye daha ihtiyacımız var.
      </p>

      <div className="mt-10 space-y-8">

        {/* Müsaitlik */}

        <div>

          <label className="font-semibold">
            Haftalık Müsaitlik
          </label>

          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="w-full border rounded-xl px-5 py-4 mt-3"
          >
            <option value="">Seçiniz</option>
            <option>Haftada 10 saatten az</option>
            <option>10-20 saat</option>
            <option>20-40 saat</option>
            <option>Tam zamanlı</option>
          </select>

        </div>

        {/* Çalışma Şekli */}

        <div>

          <label className="font-semibold">
            Çalışma Tercihi
          </label>

          <div className="flex flex-wrap gap-3 mt-4">

            {workOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleWork(item)}
                className={`px-4 py-2 rounded-full border transition ${
                  workTypes.includes(item)
                    ? "bg-black text-white border-black"
                    : "bg-white"
                }`}
              >
                {item}
              </button>
            ))}

          </div>

        </div>

        {/* Diller */}

        <div>

          <label className="font-semibold">
            Bildiğin Diller
          </label>

          <div className="flex flex-wrap gap-3 mt-4">

            {languageOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleLanguage(item)}
                className={`px-4 py-2 rounded-full border transition ${
                  languages.includes(item)
                    ? "bg-black text-white border-black"
                    : "bg-white"
                }`}
              >
                {item}
              </button>
            ))}

          </div>

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