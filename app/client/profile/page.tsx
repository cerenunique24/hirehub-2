"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, UserRound } from "lucide-react";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  company_name: string | null;
  sector: string | null;
  website: string | null;
  bio: string | null;
};

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Profili görüntülemek için giriş yapmalısınız.");
        setLoading(false);
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, avatar_url, email, phone, city, country, company_name, sector, website, bio"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Client profile load error:", profileError);
        setError("Profil bilgileri yüklenirken bir hata oluştu.");
        setLoading(false);
        return;
      }

      setProfile(
        data ?? {
          id: user.id,
          first_name: null,
          last_name: null,
          avatar_url: null,
          email: user.email ?? null,
          phone: null,
          city: null,
          country: null,
          company_name: null,
          sector: null,
          website: null,
          bio: null,
        }
      );
      setLoading(false);
    }

    void loadProfile();
  }, []);

  function updateField<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSave() {
    if (!profile) return;

    setSaving(true);
    setMessage("");
    setError("");

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        city: profile.city,
        country: profile.country,
        company_name: profile.company_name,
        sector: profile.sector,
        website: profile.website,
        bio: profile.bio,
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Client profile update error:", updateError);
      setError("Profil kaydedilirken bir hata oluştu.");
    } else {
      setMessage("Profil bilgilerin kaydedildi.");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-neutral-500">
        <Loader2 size={18} className="animate-spin" />
        Profil yükleniyor...
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    "Proje sahibi";

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black text-xl font-semibold text-white">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound size={28} />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              {fullName}
            </h1>
            <p className="text-sm text-neutral-500">
              {profile?.email ?? "E-posta belirtilmemiş"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Ad"
              value={profile?.first_name ?? ""}
              onChange={(v) => updateField("first_name", v)}
            />
            <Field
              label="Soyad"
              value={profile?.last_name ?? ""}
              onChange={(v) => updateField("last_name", v)}
            />
            <Field
              label="Telefon"
              value={profile?.phone ?? ""}
              onChange={(v) => updateField("phone", v)}
            />
            <Field
              label="Şirket adı"
              value={profile?.company_name ?? ""}
              onChange={(v) => updateField("company_name", v)}
            />
            <Field
              label="Sektör"
              value={profile?.sector ?? ""}
              onChange={(v) => updateField("sector", v)}
            />
            <Field
              label="Website"
              value={profile?.website ?? ""}
              onChange={(v) => updateField("website", v)}
            />
            <Field
              label="Şehir"
              value={profile?.city ?? ""}
              onChange={(v) => updateField("city", v)}
            />
            <Field
              label="Ülke"
              value={profile?.country ?? ""}
              onChange={(v) => updateField("country", v)}
            />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-neutral-900">
              Hakkında
            </label>
            <textarea
              value={profile?.bio ?? ""}
              onChange={(event) => updateField("bio", event.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-black"
            />
          </div>

          <div className="mt-6 flex justify-end border-t border-neutral-100 pt-5">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              <Save size={15} />
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-900">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-black"
      />
    </div>
  );
}
