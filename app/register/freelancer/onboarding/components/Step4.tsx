"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { OnboardingData } from "../page";

type Step4Props = {
  data: OnboardingData;
  onBack: () => void;
};

export default function Step4({
  data,
  onBack,
}: Step4Props) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleComplete = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yap."
        );
      }

      let avatarUrl = null;

      // Fotoğrafı Supabase Storage'a yükle
      if (data.photo) {
        const fileExt =
          data.photo.name.split(".").pop() || "jpg";

        const filePath = `${user.id}/avatar.${fileExt}`;

        const { error: uploadError } =
          await supabase.storage
            .from("avatars")
            .upload(filePath, data.photo, {
              upsert: true,
              contentType: data.photo.type,
            });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
      }

      const { error: profileError } =
        await supabase
          .from("profiles")
          .update({
            expertise: data.expertise.join(", "),
            skills: data.skills,
            bio: data.about,
            portfolio_url:
              data.portfolio || null,
            experience: data.experience,
            availability: data.availability,
            work_types: data.workTypes,
            languages: data.languages,
            avatar_url: avatarUrl,
            profile_completion: 100,
          })
          .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      router.push("/freelancers/dashboard");
    } catch (err) {
      console.error("STEP 4 ERROR:", JSON.stringify(err, null, 2));
      console.error("STEP 4 ERROR RAW:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Profil kaydedilirken bir hata oluştu."
      );

      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-center">

        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-5xl">✓</span>
        </div>

        <h1 className="text-4xl font-bold mt-8">
          Profilin Hazır!
        </h1>

        <p className="text-gray-500 mt-4 max-w-xl mx-auto">
          Tebrikler! Freelancer profilini başarıyla oluşturdun.
          Artık projeleri keşfedebilir, teklif gönderebilir ve
          HireHub'da çalışmaya başlayabilirsin.
        </p>

      </div>

      <div className="mt-12 bg-gray-50 rounded-3xl p-8">

        <h2 className="text-xl font-semibold mb-6">
          Profil Özeti
        </h2>

        <div className="space-y-4">

          <div className="flex justify-between">
            <span className="text-gray-500">
              Uzmanlık Alanları
            </span>
            <span className="font-medium">
              ✓ {data.expertise.join(", ")}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">
              Yetenekler
            </span>
            <span className="font-medium">
              ✓ {data.skills.length} yetenek
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">
              Portfolyo
            </span>
            <span className="font-medium">
              ✓ {data.portfolio ? "Eklendi" : "Yok"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">
              Çalışma Tercihleri
            </span>
            <span className="font-medium">
              ✓ Kaydedildi
            </span>
          </div>

        </div>
      </div>

      <div className="mt-8">

        <div className="flex justify-between mb-2">
          <span className="font-medium">
            Profil Tamamlanma
          </span>

          <span className="font-semibold">
            %100
          </span>
        </div>

        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-full bg-green-500 rounded-full" />
        </div>

      </div>

      {error && (
        <div className="mt-6 rounded-xl bg-red-50 text-red-600 p-4 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4 mt-10">

        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 border rounded-full py-4 font-semibold hover:bg-gray-100 transition disabled:opacity-50"
        >
          Geri
        </button>

        <button
          onClick={handleComplete}
          disabled={loading}
          className="flex-1 bg-black text-white rounded-full py-4 font-semibold hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading
            ? "Profil kaydediliyor..."
            : "Kayıt Tamamla"}
        </button>

      </div>
    </>
  );
}