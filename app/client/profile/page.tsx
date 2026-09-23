"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Camera,
  Globe2,
  Loader2,
  MapPin,
  Pencil,
  Save,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

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

type ProfileForm = {
  first_name: string;
  last_name: string;
  phone: string;
  company_name: string;
  sector: string;
  website: string;
  city: string;
  country: string;
  bio: string;
};

function emptyForm(profile: Profile | null): ProfileForm {
  return {
    first_name: profile?.first_name ?? "",
    last_name: profile?.last_name ?? "",
    phone: profile?.phone ?? "",
    company_name: profile?.company_name ?? "",
    sector: profile?.sector ?? "",
    website: profile?.website ?? "",
    city: profile?.city ?? "",
    country: profile?.country ?? "",
    bio: profile?.bio ?? "",
  };
}

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyForm(null));

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

      // `email`/`phone`/`country`/`company_name`/`sector`/`website` are
      // private columns no longer selectable via a plain table query (see
      // supabase/migrations/202609200002_restrict_profile_pii_exposure.sql).
      // Reading one's OWN full row goes through this RPC instead.
      const { data: rows, error: profileError } = await supabase.rpc(
        "get_my_full_profile"
      );
      const data = Array.isArray(rows) ? rows[0] : undefined;

      if (profileError) {
        console.error("Client profile load error:", profileError);
        setError("Profil bilgileri yüklenirken bir hata oluştu.");
        setLoading(false);
        return;
      }

      const loaded: Profile = data ?? {
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
      };

      setProfile(loaded);
      setLoading(false);
    }

    void loadProfile();
  }, []);

  function openProfileForm() {
    setProfileForm(emptyForm(profile));
    setMessage("");
    setError("");
    setShowProfileForm(true);
  }

  async function saveProfile() {
    if (!profile) return;

    setSaving(true);
    setMessage("");
    setError("");

    const supabase = createClient();

    const patch = {
      first_name: profileForm.first_name.trim() || null,
      last_name: profileForm.last_name.trim() || null,
      phone: profileForm.phone.trim() || null,
      company_name: profileForm.company_name.trim() || null,
      sector: profileForm.sector.trim() || null,
      website: profileForm.website.trim() || null,
      city: profileForm.city.trim() || null,
      country: profileForm.country.trim() || null,
      bio: profileForm.bio.trim() || null,
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", profile.id);

    if (updateError) {
      console.error("Client profile update error:", updateError);
      setError("Profil kaydedilirken bir hata oluştu.");
      setSaving(false);
      return;
    }

    setProfile((current) => (current ? { ...current, ...patch } : current));
    setMessage("Profil bilgilerin kaydedildi.");
    setSaving(false);
    setShowProfileForm(false);
  }

  function openAvatarPicker() {
    avatarInputRef.current?.click();
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      setError("Lütfen bir görsel dosyası seçin.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profil fotoğrafı en fazla 5 MB olabilir.");
      return;
    }

    setUploadingAvatar(true);
    setError("");

    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${profile.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error("Client avatar upload error:", uploadError);
      setError("Profil fotoğrafı yüklenemedi.");
      setUploadingAvatar(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Client avatar save error:", updateError);
      setError("Profil fotoğrafı kaydedilemedi.");
      setUploadingAvatar(false);
      return;
    }

    setProfile((current) => (current ? { ...current, avatar_url: publicUrl } : current));
    setUploadingAvatar(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 p-6 text-sm text-neutral-500">
        <Loader2 size={18} className="animate-spin" />
        Profil yükleniyor...
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-500">Profil bilgileri bulunamadı.</p>
        </div>
      </div>
    );
  }

  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
    "Proje sahibi";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toLocaleUpperCase("tr-TR") || "C";

  const hasCompanyInfo =
    profile.company_name || profile.sector || profile.website || profile.country;

  return (
    <main className="w-full p-6">
      <div className="mx-auto max-w-5xl">
        {/* PROFİL HEADER */}
        <section className="mb-6 flex flex-col gap-5 rounded-xl border border-[var(--color-border-subtle)] bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={fullName}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-primary-600)] text-2xl font-semibold text-white">
                  {initials || <UserRound size={28} />}
                </div>
              )}

              <button
                type="button"
                onClick={openAvatarPicker}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[var(--color-primary-600)] text-white shadow-md transition hover:bg-[var(--color-primary-700)] disabled:opacity-60"
                title="Profil fotoğrafını değiştir"
              >
                {uploadingAvatar ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
              </button>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void handleAvatarChange(event)}
                className="hidden"
              />
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">{fullName}</h1>

              <p className="mt-1 text-neutral-500">
                {profile.company_name || "Şirket bilgisi eklenmedi"}
              </p>

              {profile.city && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-neutral-500">
                  <MapPin size={14} />
                  {[profile.city, profile.country].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>

          <Button variant="secondary" onClick={openProfileForm} className="self-start sm:self-center">
            <Pencil size={16} />
            Profili Düzenle
          </Button>
        </section>

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

        {/* HAKKINDA */}
        <Card className="mb-6">
          <h2 className="mb-3 font-semibold text-[var(--color-text-primary)]">Hakkında</h2>

          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            {profile.bio || "Henüz açıklama eklenmedi."}
          </p>
        </Card>

        {/* ŞİRKET BİLGİLERİ */}
        {hasCompanyInfo && (
          <Card>
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)]">
              Şirket Bilgileri
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              {profile.company_name && (
                <InfoRow icon={<Building2 size={16} />} label="Şirket adı">
                  {profile.company_name}
                </InfoRow>
              )}

              {profile.sector && (
                <InfoRow icon={<Building2 size={16} />} label="Sektör">
                  {profile.sector}
                </InfoRow>
              )}

              {profile.website && (
                <InfoRow icon={<Globe2 size={16} />} label="Website">
                  {profile.website}
                </InfoRow>
              )}

              {profile.country && (
                <InfoRow icon={<MapPin size={16} />} label="Ülke">
                  {profile.country}
                </InfoRow>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* PROFİLİ DÜZENLE MODAL */}
      {showProfileForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            {/* MODAL HEADER */}
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-7 py-5">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Profili Düzenle</h2>
                <p className="mt-1 text-sm text-neutral-500">Profil bilgilerini güncelle.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowProfileForm(false)}
                className="text-neutral-400 transition hover:text-[var(--color-text-primary)]"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORM CONTENT */}
            <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <FormField
                  label="Ad"
                  value={profileForm.first_name}
                  onChange={(v) => setProfileForm({ ...profileForm, first_name: v })}
                  placeholder="Adınız"
                />

                <FormField
                  label="Soyad"
                  value={profileForm.last_name}
                  onChange={(v) => setProfileForm({ ...profileForm, last_name: v })}
                  placeholder="Soyadınız"
                />

                <FormField
                  label="Telefon"
                  value={profileForm.phone}
                  onChange={(v) => setProfileForm({ ...profileForm, phone: v })}
                  placeholder="Telefon numaranız"
                />

                <FormField
                  label="Şirket adı"
                  value={profileForm.company_name}
                  onChange={(v) => setProfileForm({ ...profileForm, company_name: v })}
                  placeholder="Şirket adınız"
                />

                <FormField
                  label="Sektör"
                  value={profileForm.sector}
                  onChange={(v) => setProfileForm({ ...profileForm, sector: v })}
                  placeholder="Örn. E-ticaret"
                />

                <FormField
                  label="Website"
                  value={profileForm.website}
                  onChange={(v) => setProfileForm({ ...profileForm, website: v })}
                  placeholder="https://..."
                />

                <FormField
                  label="Şehir"
                  value={profileForm.city}
                  onChange={(v) => setProfileForm({ ...profileForm, city: v })}
                  placeholder="Şehir"
                />

                <FormField
                  label="Ülke"
                  value={profileForm.country}
                  onChange={(v) => setProfileForm({ ...profileForm, country: v })}
                  placeholder="Ülke"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-neutral-900">
                  Hakkında
                </label>

                <Textarea
                  value={profileForm.bio}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, bio: event.target.value })
                  }
                  rows={4}
                  placeholder="Şirketin veya projelerin hakkında kısa bir açıklama yaz."
                />
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-100 px-7 py-4">
              <Button variant="ghost" onClick={() => setShowProfileForm(false)}>
                Vazgeç
              </Button>

              <Button variant="primary" disabled={saving} onClick={() => void saveProfile()}>
                <Save size={16} />
                {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
        <span className="text-neutral-500">{icon}</span>
        {label}
      </h3>

      <p className="mt-2 text-sm leading-6 text-neutral-600">{children}</p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-900">{label}</label>

      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
