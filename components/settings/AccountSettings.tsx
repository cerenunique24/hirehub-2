"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CreditCard,
  Loader2,
  Lock,
  LogOut,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePremium } from "@/lib/hooks/usePremium";

type Profile = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  notification_preferences: Record<string, boolean> | null;
  profile_visibility: "public" | "private";
};

type Tab = "hesap" | "bildirimler" | "gizlilik" | "guvenlik" | "uyelik" | "hesap-islemleri";

const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: "hesap", label: "Hesap", icon: User },
  { id: "bildirimler", label: "Bildirimler", icon: Bell },
  { id: "gizlilik", label: "Gizlilik", icon: Shield },
  { id: "guvenlik", label: "Güvenlik", icon: Lock },
  { id: "uyelik", label: "Üyelik", icon: Sparkles },
  { id: "hesap-islemleri", label: "Hesap İşlemleri", icon: CreditCard },
];

const NOTIFICATION_KEYS: Array<{ key: string; label: string; description: string }> = [
  { key: "email", label: "E-posta bildirimleri", description: "Önemli olaylarda e-posta al." },
  { key: "platform", label: "Platform bildirimleri", description: "Uygulama içi bildirimler." },
  { key: "messages", label: "Mesaj bildirimleri", description: "Yeni mesaj geldiğinde bildir." },
  { key: "proposals", label: "Teklif bildirimleri", description: "Teklif/davet durumu değiştiğinde bildir." },
  { key: "projects", label: "Proje bildirimleri", description: "Proje durumu değiştiğinde bildir." },
  { key: "marketing", label: "Pazarlama bildirimleri", description: "Yeni özellik ve kampanya duyuruları." },
];

export default function AccountSettings({ profileHref }: { profileHref: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { status: subscription, loading: subscriptionLoading } = usePremium();

  const [tab, setTab] = useState<Tab>("hesap");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  const [savingField, setSavingField] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email ?? "");
        const { data } = await supabase
          .from("profiles")
          .select("first_name, last_name, phone, notification_preferences, profile_visibility")
          .eq("id", user.id)
          .maybeSingle<Profile>();

        if (data) {
          setProfile(data);
          setPhone(data.phone ?? "");
        }
      }

      setLoading(false);
    }
    void load();
  }, [supabase]);

  async function persistProfile(patch: Partial<Profile>, fieldKey: string) {
    setSavingField(fieldKey);
    setSaveMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingField(null);
      return;
    }

    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);

    setSavingField(null);
    if (!error) {
      setProfile((current) => (current ? { ...current, ...patch } : current));
      setSaveMessage("Kaydedildi.");
      setTimeout(() => setSaveMessage(""), 2000);
    }
  }

  async function handleChangePassword() {
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 6) {
      setPasswordError("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Şifreler eşleşmiyor.");
      return;
    }

    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);

    if (error) {
      setPasswordError("Şifre güncellenemedi: " + error.message);
      return;
    }

    setPasswordSuccess("Şifren güncellendi.");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const notificationPrefs = profile?.notification_preferences ?? {};

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                tab === t.id ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        {tab === "hesap" && (
          <section>
            <h2 className="font-semibold text-gray-900">Hesap</h2>
            <p className="mt-1 text-sm text-gray-500">Temel hesap bilgilerin.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500">Ad Soyad</p>
                <p className="mt-1 text-sm text-gray-900">
                  {[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Belirtilmemiş"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">E-posta</p>
                <p className="mt-1 text-sm text-gray-900">{email}</p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-500">Telefon</label>
                <div className="mt-1 flex gap-2">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+90 5xx xxx xx xx"
                    className="w-full max-w-xs rounded-xl border border-gray-200 px-3.5 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void persistProfile({ phone }, "phone")}
                    disabled={savingField === "phone"}
                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {savingField === "phone" ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </div>
            </div>

            <Link href={profileHref} className="mt-6 inline-block text-sm font-medium text-gray-700 underline-offset-2 hover:underline">
              Profil bilgilerini düzenle →
            </Link>
          </section>
        )}

        {tab === "bildirimler" && (
          <section>
            <h2 className="font-semibold text-gray-900">Bildirimler</h2>
            <p className="mt-1 text-sm text-gray-500">Hangi konularda bildirim almak istediğini seç.</p>

            <div className="mt-6 divide-y divide-gray-100">
              {NOTIFICATION_KEYS.map((item) => {
                const enabled = notificationPrefs[item.key] !== false;
                return (
                  <div key={item.key} className="flex items-center justify-between gap-4 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void persistProfile(
                          { notification_preferences: { ...notificationPrefs, [item.key]: !enabled } },
                          item.key
                        )
                      }
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-gray-900" : "bg-gray-200"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                          enabled ? "left-5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "gizlilik" && (
          <section>
            <h2 className="font-semibold text-gray-900">Gizlilik</h2>
            <p className="mt-1 text-sm text-gray-500">Profilinin kimler tarafından görülebileceğini yönet.</p>

            <div className="mt-6 space-y-3">
              {(
                [
                  { value: "public" as const, label: "Herkese açık", description: "Profilin arama ve keşfette herkese görünür." },
                  { value: "private" as const, label: "Sadece ilgili taraflar", description: "Sadece birlikte çalıştığın client/freelancer'lar görebilir." },
                ]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void persistProfile({ profile_visibility: option.value }, "visibility")}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                    profile?.profile_visibility === option.value ? "border-gray-900 bg-gray-50" : "border-gray-200"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{option.label}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "guvenlik" && (
          <section>
            <h2 className="font-semibold text-gray-900">Güvenlik</h2>
            <p className="mt-1 text-sm text-gray-500">Şifreni güncelle.</p>

            {passwordError && <p className="mt-4 text-sm text-red-600">{passwordError}</p>}
            {passwordSuccess && <p className="mt-4 text-sm text-emerald-700">{passwordSuccess}</p>}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yeni şifre"
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifre (tekrar)"
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleChangePassword()}
              disabled={passwordSaving}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {passwordSaving && <Loader2 size={16} className="animate-spin" />}
              Şifreyi Güncelle
            </button>
          </section>
        )}

        {tab === "uyelik" && (
          <section>
            <h2 className="font-semibold text-gray-900">Üyelik</h2>
            <p className="mt-1 text-sm text-gray-500">Plan durumun ve Premium yönetimi.</p>

            <div className="mt-6 rounded-xl bg-gray-50 p-5">
              {subscriptionLoading ? (
                <p className="text-sm text-gray-500">Yükleniyor...</p>
              ) : subscription?.plan === "premium" ? (
                <>
                  <p className="text-sm font-semibold text-emerald-700">
                    Premium {subscription.status === "trial" ? "(deneme)" : ""} aktif
                  </p>
                  {subscription.expires_at && (
                    <p className="mt-1 text-xs text-gray-500">
                      {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(
                        new Date(subscription.expires_at)
                      )}{" "}
                      tarihine kadar geçerli.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-600">Şu anda Ücretsiz plandasın.</p>
              )}
              <Link
                href="/premium"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white"
              >
                <Sparkles size={15} />
                Premium'u Yönet
              </Link>
            </div>
          </section>
        )}

        {tab === "hesap-islemleri" && (
          <section>
            <h2 className="font-semibold text-gray-900">Hesap İşlemleri</h2>
            <p className="mt-1 text-sm text-gray-500">Oturumunu kapat veya hesabınla ilgili işlemleri yönet.</p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={16} />
                Çıkış Yap
              </button>

              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Hesabı devre dışı bırak</p>
                  <p className="text-xs text-gray-500">Yakında eklenecek.</p>
                </div>
                <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">Yakında</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Hesabı sil</p>
                  <p className="text-xs text-gray-500">Yakında eklenecek.</p>
                </div>
                <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">Yakında</span>
              </div>
            </div>
          </section>
        )}

        {saveMessage && <p className="mt-6 text-sm text-emerald-700">{saveMessage}</p>}
      </div>
    </div>
  );
}
