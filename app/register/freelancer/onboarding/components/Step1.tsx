"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import type { OnboardingData } from "../page";

type Step1Props = {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
};

const categories = [
  "UI/UX Tasarım",
  "Web Tasarım",
  "Web Geliştirme",
  "Mobil Uygulama",
  "Yazılım Geliştirme",
  "Marka Tasarımı",
  "Grafik Tasarım",
  "E-Ticaret",
  "Dijital Pazarlama",
  "İçerik Üretimi",
  "3D Tasarım",
  "Mimari & İç Mekân",
  "Diğer",
];

export default function Step1({
  data,
  onChange,
  onNext,
}: Step1Props) {
  const [error, setError] = useState("");

  function toggleCategory(category: string) {
    setError("");

    const selected = data.categories.includes(category);

    if (selected) {
      onChange({
        categories: data.categories.filter(
          (item) => item !== category
        ),
      });

      return;
    }

    if (data.categories.length >= 3) {
      setError("En fazla 3 kategori seçebilirsin.");
      return;
    }

    onChange({
      categories: [
        ...data.categories,
        category,
      ],
    });
  }

  function continueStep() {
    if (data.categories.length === 0) {
      setError("En az 1 kategori seçmelisin.");
      return;
    }

    onNext();
  }

  return (
    <div>
      <div className="mb-10">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
          Adım 1 / 3
        </span>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
          Hangi alanlarda çalışıyorsun?
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          Ana çalışma alanlarını seç. En fazla 3 kategori
          belirleyebilirsin.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {categories.map((category) => {
          const selected =
            data.categories.includes(category);

          return (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className={`flex min-h-[58px] items-center justify-between rounded-2xl border px-4 text-left text-sm font-medium transition ${
                selected
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-gray-800 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              <span>{category}</span>

              {selected && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-black">
                  <Check size={15} strokeWidth={2.5} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {data.categories.length} / 3 kategori seçildi
        </p>

        {data.categories.length === 3 && (
          <p className="text-xs font-medium text-gray-500">
            Maksimum kategori sayısına ulaştın.
          </p>
        )}
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-end border-t border-gray-100 pt-7">
        <button
          type="button"
          onClick={continueStep}
          className="flex h-12 min-w-[170px] items-center justify-center rounded-xl bg-black px-7 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          Devam et
        </button>
      </div>
    </div>
  );
}