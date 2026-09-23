"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

import Stepper from "./components/Stepper";
import Step1 from "./components/Step1";
import Step2 from "./components/Step2";
import Step3 from "./components/Step3";

export type OnboardingData = {
  categories: string[];
  expertiseAreas: string[];
  experience: string;
  country: string;
  city: string;

  jobs: string[];
  skills: string[];

  workTypes: string[];
  languages: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  availability: string;

  about: string;
  photo: File | null;

  aiTitle: string;
};

const initialData: OnboardingData = {
  categories: [],
  expertiseAreas: [],
  experience: "",
  country: "",
  city: "",

  jobs: [],
  skills: [],

  workTypes: [],
  languages: [],
  hourlyRateMin: null,
  hourlyRateMax: null,
  availability: "",

  about: "",
  photo: null,

  aiTitle: "",
};

export default function FreelancerOnboarding() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [data, setData] =
    useState<OnboardingData>(initialData);

  const [saving, setSaving] = useState(false);

  const updateData = (
    updates: Partial<OnboardingData>
  ) => {
    setData((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  function goToStep(nextStep: number) {
    setStep(
      Math.min(
        Math.max(nextStep, 1),
        3
      )
    );
  }

  async function completeOnboarding() {
    if (saving) return;

    setSaving(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Oturum bulunamadı. Lütfen tekrar giriş yap."
        );
      }

      if (!data.about.trim()) {
        throw new Error(
          "Hakkında alanı boş bırakılamaz."
        );
      }

      if (!data.aiTitle.trim()) {
        throw new Error(
          "Önce AI ile uzmanlık başlığını oluştur."
        );
      }

      /*
       * Profiles tablosunda categories ve jobs için
       * ayrı kolon bulunmuyor.
       *
       * categories -> project_types
       * expertiseAreas + jobs -> expertise
       * skills -> skills
       */

      const expertiseValues = [
        ...data.expertiseAreas,
        ...data.jobs,
      ].filter(Boolean);

      const uniqueExpertise = [
        ...new Set(expertiseValues),
      ];

      const expertise =
        uniqueExpertise.length > 0
          ? uniqueExpertise.join(", ")
          : null;

      const updatePayload = {
        role: "freelancer",

        title: data.aiTitle.trim(),

        bio: data.about.trim(),

        experience:
          data.experience.trim() || null,

        country:
          data.country.trim() || null,

        city:
          data.city.trim() || null,

        project_types:
          data.categories.length > 0
            ? data.categories
            : null,

        expertise,

        skills:
          data.skills.length > 0
            ? data.skills
            : null,

        work_types:
          data.workTypes.length > 0
            ? data.workTypes
            : null,

        languages:
          data.languages.length > 0
            ? data.languages
            : null,

        hourly_rate_min:
          data.hourlyRateMin,

        hourly_rate_max:
          data.hourlyRateMax,

        /*
         * Mevcut sistemde hourly_rate alanı da bulunduğu
         * için geriye dönük uyumluluk amacıyla minimum
         * saatlik ücreti buraya da yazıyoruz.
         */
        hourly_rate:
          data.hourlyRateMin,

        availability:
          data.availability.trim() || null,

        profile_completion: 100,

        updated_at: new Date().toISOString(),
      };

      const { error: updateError } =
        await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", user.id);

      if (updateError) {
        console.error(
          "Freelancer profile update error:",
          {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code,
          }
        );

        throw new Error(
          updateError.message ||
            "Profil kaydedilemedi."
        );
      }

      /*
       * Fotoğraf yükleme akışını şimdilik ayrı tutuyoruz.
       * Çünkü mevcut onboarding'de photo File olarak tutuluyor,
       * ancak Storage bucket adı ve politikaları bu dosyada
       * bilinmiyor. Profil bilgilerinin kaydını bununla
       * bloke etmiyoruz.
       */

      router.replace("/freelancers/dashboard");
    } catch (error) {
      console.error(
        "Freelancer onboarding completion error:",
        error
      );

      setSaving(false);

      const message =
        error instanceof Error
          ? error.message
          : "Profil oluşturulurken bir hata oluştu.";

      alert(message);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8 sm:py-14">
        <Stepper step={step} />

        <div className="mx-auto max-w-3xl">
          {step === 1 && (
            <Step1
              data={data}
              onChange={updateData}
              onNext={() => goToStep(2)}
            />
          )}

          {step === 2 && (
            <Step2
              data={data}
              onChange={updateData}
              onBack={() => goToStep(1)}
              onNext={() => goToStep(3)}
            />
          )}

          {step === 3 && (
            <Step3
              data={data}
              onChange={updateData}
              onBack={() => goToStep(2)}
              onNext={completeOnboarding}
              saving={saving}
            />
          )}
        </div>
      </div>
    </main>
  );
}
