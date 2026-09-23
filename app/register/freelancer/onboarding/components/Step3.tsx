"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Pencil,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import type { OnboardingData } from "../page";

type Step3Props = {
  data: OnboardingData;
  onChange: (
    updates: Partial<OnboardingData>
  ) => void;
  onBack: () => void;
  onNext: () => void;
  saving: boolean;
};

export default function Step3({
  data,
  onChange,
  onBack,
  onNext,
  saving,
}: Step3Props) {
  const [error, setError] = useState("");
  const [generating, setGenerating] =
    useState(false);
  const [manualEntry, setManualEntry] =
    useState(false);
  const [manualTitle, setManualTitle] =
    useState("");

  const aboutLength = data.about.length;

  function handleAboutChange(value: string) {
    if (value.length > 600) return;

    onChange({
      about: value,
    });

    setError("");
  }

  async function generateTitle() {
    setError("");

    if (data.about.trim().length < 80) {
      setError(
        "Hakkında alanını en az 80 karakter doldur."
      );
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch(
        "/api/ai/generate-freelancer-title",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            categories: data.categories,
            expertiseAreas:
              data.expertiseAreas,
            skills: data.skills,
            experience: data.experience,
            about: data.about,
          }),
        }
      );

      // Önce ham metni oku — API her zaman JSON döndürmeyebilir
      // (ör. beklenmedik bir sunucu hatasında Next.js kendi HTML
      // hata sayfasını dönebilir). Ham metni elimizde tutarsak
      // hata ayıklarken "{}" gibi anlamsız bir log yerine gerçek
      // içeriği görebiliriz.
      const rawText = await response.text();

      let result: {
        title?: string;
        error?: string;
        message?: string;
        retryable?: boolean;
      } = {};

      if (rawText) {
        try {
          result = JSON.parse(rawText);
        } catch {
          // Next.js'in dev konsol overlay'i, console.error'a ikinci
          // argüman olarak verilen obje bazen "{}" gibi boş görünebiliyor
          // (overlay'in kendi serileştirmesi) — bu yüzden burada TEK bir
          // önceden string'e çevrilmiş mesaj basıyoruz, obje değil.
          console.error(
            `Freelancer title API: JSON olmayan yanıt. status=${response.status} statusText=${response.statusText} bodyPreview=${JSON.stringify(rawText.slice(0, 500))}`
          );
        }
      }

      if (!response.ok) {
        console.error(
          `Freelancer title API error: status=${response.status} statusText=${response.statusText} error=${JSON.stringify(result.error)} message=${JSON.stringify(result.message)} bodyPreview=${JSON.stringify(rawText.slice(0, 500))}`
        );

        throw new Error(
          result.error ||
            result.message ||
            `Uzmanlık başlığı oluşturulamadı. (HTTP ${response.status}${
              response.statusText ? ` ${response.statusText}` : ""
            })`
        );
      }

      if (!result.title) {
        console.error(
          `Freelancer title API: başarılı yanıtta title alanı yok. bodyPreview=${JSON.stringify(rawText.slice(0, 500))}`
        );

        throw new Error(
          "AI geçerli bir uzmanlık başlığı döndürmedi."
        );
      }

      onChange({
        aiTitle: result.title.trim(),
      });

      setError("");
      setManualEntry(false);
    } catch (error) {
      console.error(
        "Uzmanlık başlığı oluşturma hatası:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Uzmanlık başlığı oluşturulurken bir sorun oluştu."
      );
    } finally {
      setGenerating(false);
    }
  }

  function saveManualTitle() {
    if (!manualTitle.trim()) {
      setError("Bir başlık yaz.");
      return;
    }

    onChange({ aiTitle: manualTitle.trim() });
    setManualEntry(false);
    setManualTitle("");
    setError("");
  }

  function continueStep() {
    setError("");

    if (data.about.trim().length < 80) {
      setError(
        "Hakkında alanı en az 80 karakter olmalı."
      );
      return;
    }

    if (!data.aiTitle.trim()) {
      setError(
        "Önce yapay zekâ ile uzmanlık başlığını oluştur."
      );
      return;
    }

    onNext();
  }

  return (
    <div>
      <div className="mb-10">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
          Adım 3 / 3
        </span>

        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.01em] text-gray-950 sm:text-4xl">
          Seni biraz daha tanıyalım
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          Kısa bir tanıtım yaz. AI bunu seçtiğin
          uzmanlıklarla birlikte profesyonel profil
          başlığına dönüştürecek.
        </p>
      </div>

      <div className="space-y-9">
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">
                Hakkında
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Deneyimini, yaklaşımını ve müşterilere
                sunduğun değeri anlat.
              </p>
            </div>

            <span
              className={`shrink-0 text-xs ${
                aboutLength < 80
                  ? "text-gray-400"
                  : "text-gray-600"
              }`}
            >
              {aboutLength} / 600
            </span>
          </div>

          <textarea
            value={data.about}
            onChange={(event) =>
              handleAboutChange(
                event.target.value
              )
            }
            maxLength={600}
            rows={7}
            placeholder="Örneğin: 5 yıldır UI/UX ve ürün tasarımı alanında çalışıyorum. Web ve mobil ürünlerde kullanıcı deneyimi, arayüz tasarımı ve tasarım sistemleri üzerine çalışıyorum..."
            className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm leading-7 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[var(--color-primary-600)]"
          />

          <p className="mt-2 text-xs text-gray-400">
            En az 80, en fazla 600 karakter.
          </p>
        </section>

        <div className="border-t border-gray-100" />

        <section>
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <Sparkles
                size={18}
                className="text-gray-900"
              />

              <h2 className="text-lg font-semibold text-gray-950">
                AI destekli profil başlığın
              </h2>
            </div>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Kategorilerini, uzmanlıklarını,
              becerilerini, deneyimini ve Hakkında
              alanını analiz ederek sana uygun bir
              başlık oluşturacağız.
            </p>
          </div>

          {data.aiTitle ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-600)] text-white">
                  <CheckCircle2 size={19} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Profil başlığın
                  </p>

                  <p className="mt-1 text-lg font-semibold text-gray-950">
                    {data.aiTitle}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Bu başlığı daha sonra profilinden
                    değiştirebilirsin.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={generateTitle}
                  disabled={
                    generating || saving
                  }
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  {generating
                    ? "Yeniden oluşturuluyor..."
                    : "Yeniden oluştur"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setManualTitle(data.aiTitle);
                    setManualEntry(true);
                  }}
                  disabled={generating || saving}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Pencil size={14} />
                  Başlığı düzenle
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Henüz profil başlığın
                    oluşturulmadı.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Profil bilgilerini analiz ederek
                    sana uygun profesyonel bir başlık
                    oluşturacağız.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={generateTitle}
                  disabled={
                    generating ||
                    saving ||
                    data.about.trim()
                      .length < 80
                  }
                  className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:bg-gray-200"
                >
                  {generating ? (
                    <>
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                      Oluşturuluyor
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Profil başlığımı oluştur
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setManualTitle("");
                  setManualEntry(true);
                  setError("");
                }}
                disabled={generating || saving}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Pencil size={14} />
                veya kendi başlığını yaz
              </button>
            </div>
          )}

          {manualEntry && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm font-semibold text-gray-900">
                Kendi profil başlığını yaz
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Örneğin: &quot;UI/UX Tasarımcısı&quot; ya da &quot;Frontend Geliştirici&quot;. Bunu daha sonra profilinden değiştirebilirsin.
              </p>

              <input
                value={manualTitle}
                onChange={(event) =>
                  setManualTitle(event.target.value)
                }
                maxLength={80}
                placeholder="Örn. UI/UX & Mobil Ürün Tasarımcısı"
                className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[var(--color-primary-600)]"
              />

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveManualTitle}
                  className="rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
                >
                  Başlığı kaydet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualEntry(false);
                    setManualTitle("");
                  }}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </section>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 text-sm leading-6 text-red-600">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft size={16} />
            Geri
          </button>

          <button
            type="button"
            onClick={continueStep}
            disabled={
              saving || generating
            }
            className="flex h-12 min-w-[190px] items-center justify-center rounded-xl bg-[var(--color-primary-600)] px-7 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Profil oluşturuluyor..."
              : "Kaydı tamamla"}
          </button>
        </div>
      </div>
    </div>
  );
}