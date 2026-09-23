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
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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

        // `phone`/`notification_preferences`/`profile_visibility` are
        // private columns no longer selectable via a plain table query
        // (see supabase/migrations/202609200002_restrict_profile_pii_exposure.sql).
        // Reading one's OWN full row goes through this RPC instead.
        const { data: rows } = await supabase.rpc("get_my_full_profile");
        const data = Array.isArray(rows) ? (rows[0] as Profile | undefined) : undefined;

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
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Loader2 size={18} className="animate-spin" />
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="grid gap-[var(--rhythm-card-gap)] lg:grid-cols-[220px_1fr]">
      <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-text-primary)]",
              ].join(" ")}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </nav>

      <Card>
        {tab === "hesap" && (
          <section>
            <h2 className="font-semibold text-[var(--color-text-primary)]">Hesap</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Temel hesap bilgilerin.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">Ad Soyad</p>
                <p className="mt-1 text-sm text-[var(--color-text-primary)]">
                  {[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Belirtilmemiş"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">E-posta</p>
                <p className="mt-1 text-sm text-[var(--color-text-primary)]">{email}</p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Telefon</label>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+90 5xx xxx xx xx"
                    className="max-w-xs"
                  />
                  <Button
                    variant="primary"
                    onClick={() => void persistProfile({ phone }, "phone")}
                    loading={savingField === "phone"}
                  >
                    {savingField === "phone" ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </div>
            </div>

            <Link
              href={profileHref}
              className="mt-6 inline-block text-sm font-medium text-[var(--color-primary-600)] underline-offset-2 hover:underline"
            >
              Profil bilgilerini düzenle →
            </Link>
          </section>
        )}

        {tab === "bildirimler" && (
          <section>
            <h2 className="font-semibold text-[var(--color-text-primary)]">Bildirimler</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Hangi konularda bildirim almak istediğini seç.
            </p>

            <div className="mt-6 divide-y divide-[var(--color-border-subtle)]">
              {NOTIFICATION_KEYS.map((item) => {
                const enabled = notificationPrefs[item.key] !== false;
                return (
                  <div key={item.key} className="flex items-center justify-between gap-4 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.label}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void persistProfile(
                          { notification_preferences: { ...notificationPrefs, [item.key]: !enabled } },
                          item.key
                        )
                      }
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                        enabled ? "bg-[var(--color-primary-600)]" : "bg-[var(--color-surface-2)]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--color-surface-1)] shadow transition ${
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
            <h2 className="font-semibold text-[var(--color-text-primary)]">Gizlilik</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Profilinin kimler tarafından görülebileceğini yönet.
            </p>

            <div className="mt-6 space-y-3">
              {(
                [
                  { value: "public" as const, label: "Herkese açık", description: "Profilin arama ve keşfette herkese görünür." },
                  { value: "private" as const, label: "Sadece ilgili taraflar", description: "Sadece birlikte çalıştığın client/freelancer'lar görebilir." },
                ]
              ).map((option) => {
                const selected = profile?.profile_visibility === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => void persistProfile({ profile_visibility: option.value }, "visibility")}
                    className={[
                      "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition",
                      selected
                        ? "border-[var(--color-primary-600)] bg-[var(--color-primary-50)]"
                        : "border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)]",
                    ].join(" ")}
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{option.label}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {tab === "guvenlik" && (
          <section>
            <h2 className="font-semibold text-[var(--color-text-primary)]">Güvenlik</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Şifreni güncelle.</p>

            {passwordError && <p className="mt-4 text-sm text-[var(--color-error-600)]">{passwordError}</p>}
            {passwordSuccess && <p className="mt-4 text-sm text-[var(--color-success-600)]">{passwordSuccess}</p>}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yeni şifre"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifre (tekrar)"
              />
            </div>

            <Button
              variant="primary"
              className="mt-4"
              onClick={() => void handleChangePassword()}
              loading={passwordSaving}
            >
              Şifreyi Güncelle
            </Button>
          </section>
        )}

        {tab === "uyelik" && (
          <section>
            <h2 className="font-semibold text-[var(--color-text-primary)]">Üyelik</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Plan durumun ve Premium yönetimi.</p>

            <div className="mt-6 rounded-lg bg-[var(--color-canvas)] p-5">
              {subscriptionLoading ? (
                <p className="text-sm text-[var(--color-text-secondary)]">Yükleniyor...</p>
              ) : subscription?.plan === "plus" || subscription?.plan === "pro" ? (
                <>
                  <p className="text-sm font-semibold text-[var(--color-success-600)]">
                    {subscription.plan === "pro" ? "Pro" : "Plus"} {subscription.status === "trial" ? "(deneme)" : ""} aktif
                  </p>
                  {subscription.expires_at && (
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(
                        new Date(subscription.expires_at)
                      )}{" "}
                      tarihine kadar geçerli.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">Şu anda Ücretsiz plandasın.</p>
              )}

              <Button variant="primary" className="mt-4" onClick={() => router.push("/premium")}>
                <Sparkles size={15} />
                Paketimi Yönet
              </Button>
            </div>
          </section>
        )}

        {tab === "hesap-islemleri" && (
          <section>
            <h2 className="font-semibold text-[var(--color-text-primary)]">Hesap İşlemleri</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Oturumunu kapat veya hesabınla ilgili işlemleri yönet.
            </p>

            <div className="mt-6 space-y-3">
              <Button variant="secondary" onClick={() => void handleLogout()}>
                <LogOut size={16} />
                Çıkış Yap
              </Button>

              <div className="flex items-center justify-between rounded-lg bg-[var(--color-canvas)] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Hesabı devre dışı bırak</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Yakında eklenecek.</p>
                </div>
                <Badge>Yakında</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[var(--color-canvas)] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Hesabı sil</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Yakında eklenecek.</p>
                </div>
                <Badge>Yakında</Badge>
              </div>
            </div>
          </section>
        )}

        {saveMessage && <p className="mt-6 text-sm text-[var(--color-success-600)]">{saveMessage}</p>}
      </Card>
    </div>
  );
}
