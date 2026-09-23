"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  RegisterSplitLayout,
  RegisterFormHeader,
  RegisterField,
  PasswordInput,
  PasswordChecklist,
  ConsentGroup,
} from "@/components/auth/RegisterSplitLayout";

type LegalDocument = "kvkk" | "terms" | null;

export default function FreelancerRegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [acceptKvkk, setAcceptKvkk] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [activeDocument, setActiveDocument] =
    useState<LegalDocument>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const passwordRules = useMemo(
    () => [
      {
        label: "En az 8 karakter",
        valid: form.password.length >= 8,
      },
      {
        label: "En az 1 büyük harf",
        valid: /[A-Z]/.test(form.password),
      },
      {
        label: "En az 1 küçük harf",
        valid: /[a-z]/.test(form.password),
      },
      {
        label: "En az 1 rakam",
        valid: /[0-9]/.test(form.password),
      },
    ],
    [form.password]
  );

  const passwordValid = passwordRules.every(
    (rule) => rule.valid
  );

  const emailValid =
    form.email.length === 0 ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);

  const passwordsMatch =
    form.confirmPassword.length > 0 &&
    form.password === form.confirmPassword;

  const formValid =
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    emailValid &&
    form.email.trim().length > 0 &&
    passwordValid &&
    passwordsMatch &&
    acceptKvkk &&
    acceptTerms;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formValid) {
      setError(
        "Devam etmek için bilgilerini tamamlamalı ve gerekli onayları vermelisin."
      );
      return;
    }

    setError("");
    setLoading(true);

    const email = form.email.trim().toLowerCase();
    const acceptedAt = new Date().toISOString();

    const { data, error: signUpError } =
      await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/register/freelancer/setup`,
          data: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            role: "freelancer",

            consent_kvkk_version: "v1",
            consent_terms_version: "v1",
            consent_kvkk_accepted_at: acceptedAt,
            consent_terms_accepted_at: acceptedAt,
          },
        },
      });

    if (signUpError) {
      setError(
        "Hesap oluşturulamadı. " + signUpError.message
      );
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError(
        "Hesap oluşturuldu ancak kullanıcı bilgisi alınamadı. Lütfen tekrar deneyin."
      );
      setLoading(false);
      return;
    }

    localStorage.setItem(
      "collacrew_signup_email",
      email
    );

    localStorage.setItem(
      "collacrew_signup_name",
      `${form.firstName.trim()} ${form.lastName.trim()}`
    );

    router.push("/register/freelancer/verify");
  }

  return (
    <>
      <RegisterSplitLayout
        image="https://images.unsplash.com/photo-1487611459768-bd414656ea10?q=80&w=1400&auto=format&fit=crop"
        eyebrow="Freelancer kaydı"
        title="Yeteneğini doğru projeyle buluştur."
        description="CollaCrew'da uzmanlığını göster, doğru projeleri keşfet ve müşterilerle birlikte çalış."
        highlights={[
          "Profilini oluştur",
          "Sana uygun projeleri keşfet",
          "Müşterilerle çalış",
        ]}
      >
        <RegisterFormHeader
          step={1}
          totalSteps={3}
          stepLabel="Hesap oluştur"
          title="Freelancer hesabını oluştur"
          description="Hesabını oluşturduktan sonra e-posta adresini doğrulayacak ve profesyonel profilini tamamlayacaksın."
        />

        <form onSubmit={handleSubmit} className="space-y-[var(--space-5)]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <RegisterField label="Ad" htmlFor="firstName">
                <Input
                  id="firstName"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="Adın"
                  autoComplete="given-name"
                />
              </RegisterField>

              <RegisterField label="Soyad" htmlFor="lastName">
                <Input
                  id="lastName"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Soyadın"
                  autoComplete="family-name"
                />
              </RegisterField>
            </div>

            <RegisterField
              label="E-posta"
              htmlFor="email"
              hint={!emailValid ? "Geçerli bir e-posta adresi gir." : undefined}
              hintTone="error"
            >
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="ornek@email.com"
                autoComplete="email"
                hasError={!emailValid}
              />
            </RegisterField>

            <RegisterField label="Şifre" htmlFor="password">
              <PasswordInput
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="En az 8 karakter"
                autoComplete="new-password"
                visible={showPassword}
                onToggle={() => setShowPassword((prev) => !prev)}
              />

              {form.password.length > 0 && !passwordValid && (
                <PasswordChecklist rules={passwordRules} />
              )}

              {passwordValid && form.password.length > 0 && (
                <p className="mt-1.5 text-xs text-[var(--color-success-600)]">Güçlü bir şifre oluşturdun.</p>
              )}
            </RegisterField>

            <RegisterField
              label="Şifre tekrar"
              htmlFor="confirmPassword"
              hint={
                form.confirmPassword.length > 0
                  ? passwordsMatch
                    ? "Şifreler eşleşiyor."
                    : "Şifreler eşleşmiyor."
                  : undefined
              }
              hintTone={passwordsMatch ? "success" : "error"}
            >
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Şifreni tekrar gir"
                autoComplete="new-password"
                hasError={form.confirmPassword.length > 0 && !passwordsMatch}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((prev) => !prev)}
              />
            </RegisterField>
          </div>

          {/* ONAYLAR */}
          <ConsentGroup
            kvkk={acceptKvkk}
            terms={acceptTerms}
            onKvkkChange={setAcceptKvkk}
            onTermsChange={setAcceptTerms}
            onOpenDocument={setActiveDocument}
          />

          {/* GÜVENLİK */}
          <p className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            Hesabını oluşturduktan sonra e-posta adresini doğrulaman gerekecek.
          </p>

          {/* HATA */}
          {error && (
            <div className="cc-body-sm rounded-[var(--radius-input)] border border-red-200 bg-[var(--color-error-50)] px-3 py-2.5 text-[var(--color-error-600)]">
              {error}
            </div>
          )}

          {/* DEVAM */}
          <div className="space-y-3">
            <Button type="submit" size="lg" disabled={!formValid || loading} loading={loading} className="w-full">
              {loading ? "Hesap oluşturuluyor..." : "Devam Et"}
              {!loading && <ArrowRight size={16} />}
            </Button>

            <p className="cc-body-sm text-center text-[var(--color-text-secondary)]">
              Zaten hesabın var mı?{" "}
              <Link href="/login" className="font-medium text-[var(--color-primary-600)] hover:underline">
                Giriş yap
              </Link>
            </p>
          </div>
        </form>
      </RegisterSplitLayout>

      {/* HUKUKİ METİN MODALI */}
      {activeDocument && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-document-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                  CollaCrew
                </p>

                <h2
                  id="legal-document-title"
                  className="mt-1 text-xl font-semibold text-gray-950"
                >
                  {activeDocument === "kvkk"
                    ? "KVKK Aydınlatma Metni"
                    : "Kullanım Koşulları"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveDocument(null)
                }
                aria-label="Metni kapat"
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-[var(--color-text-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL CONTENT */}
            <div className="overflow-y-auto px-6 py-6 text-sm leading-7 text-gray-600">
              {activeDocument === "kvkk" ? (
                <div className="space-y-6">
                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      1. Amaç
                    </h3>

                    <p>
                      Bu Aydınlatma Metni, CollaCrew
                      platformunu kullanan kişilerin kişisel
                      verilerinin hangi kapsamda işlendiği
                      hakkında bilgi vermek amacıyla
                      hazırlanmıştır.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      2. İşlenen Kişisel Veriler
                    </h3>

                    <p>
                      Üyelik sırasında ad, soyad, e-posta
                      adresi ve hesap türü gibi bilgiler
                      işlenebilir. Platformun kullanımı
                      sırasında profil bilgileri, yetenekler,
                      proje bilgileri, teklif bilgileri,
                      mesajlar ve platform üzerindeki işlem
                      kayıtları da ilgili hizmetlerin
                      sunulması amacıyla işlenebilir.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      3. Kişisel Verilerin İşlenme Amaçları
                    </h3>

                    <p>
                      Kişisel veriler; kullanıcı hesabının
                      oluşturulması ve yönetilmesi, freelancer
                      ve proje sahibi eşleştirmelerinin
                      gerçekleştirilmesi, proje ve teklif
                      süreçlerinin yürütülmesi, kullanıcı
                      güvenliğinin sağlanması, iletişim
                      faaliyetlerinin yürütülmesi ve
                      platformun geliştirilmesi amaçlarıyla
                      işlenebilir.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      4. Kişisel Verilerin Aktarılması
                    </h3>

                    <p>
                      Kişisel veriler, hizmetin
                      gerçekleştirilebilmesi için gerekli
                      olduğu ölçüde teknik hizmet
                      sağlayıcılarına ve kanunen yetkili
                      kişi veya kurumlara aktarılabilir.
                      Bunun dışında kişisel veriler hukuka
                      aykırı şekilde üçüncü kişilerle
                      paylaşılmaz.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      5. Verilerin Saklanması
                    </h3>

                    <p>
                      Kişisel veriler, işleme amaçlarının
                      gerektirdiği süre boyunca ve ilgili
                      mevzuatta öngörülen saklama süreleri
                      dikkate alınarak muhafaza edilir.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      6. KVKK Kapsamındaki Haklar
                    </h3>

                    <p>
                      6698 sayılı Kişisel Verilerin Korunması
                      Kanunu kapsamında kullanıcılar; kişisel
                      verilerinin işlenip işlenmediğini
                      öğrenme, işlenmişse buna ilişkin bilgi
                      talep etme, verilerin düzeltilmesini,
                      silinmesini veya yok edilmesini talep
                      etme ve kanunda düzenlenen diğer
                      haklarını kullanma hakkına sahiptir.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      7. İletişim
                    </h3>

                    <p>
                      Kişisel verilerinizle ilgili talepleriniz
                      için CollaCrew üzerinden sunulan
                      iletişim kanallarını kullanabilirsiniz.
                    </p>
                  </section>

                  <div className="rounded-xl bg-gray-50 p-4 text-xs leading-5 text-gray-500">
                    Bu metin CollaCrew&apos;un kayıt ve
                    platform akışının teknik yapısına göre
                    hazırlanmış bir taslaktır. Yayına alınmadan
                    önce veri sorumlusu bilgileri, saklama
                    süreleri, aktarım yapılan taraflar ve
                    iletişim bilgileri işletmenin gerçek
                    süreçlerine göre kesinleştirilmelidir.
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      1. CollaCrew Kullanımı
                    </h3>

                    <p>
                      CollaCrew, proje sahipleri ile
                      freelancerları bir araya getiren bir
                      dijital platformdur. Platforma kayıt
                      olarak bu Kullanım Koşulları&apos;nı
                      kabul etmiş olursunuz.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      2. Kullanıcı Hesabı
                    </h3>

                    <p>
                      Kullanıcı, kayıt sırasında verdiği
                      bilgilerin doğru, güncel ve kendisine
                      ait olduğunu kabul eder. Hesap
                      bilgilerinin güvenliğinden kullanıcı
                      sorumludur.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      3. Freelancer Kullanımı
                    </h3>

                    <p>
                      Freelancerlar profillerinde sundukları
                      hizmet, deneyim, yetenek ve portföy
                      bilgilerinin doğru olduğunu kabul eder.
                      Başka kişilere ait bilgi veya eserlerin
                      kendisine aitmiş gibi sunulması yasaktır.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      4. Proje Sahipleri
                    </h3>

                    <p>
                      Proje sahipleri oluşturdukları
                      projelerin ve paylaştıkları içeriklerin
                      hukuka uygun olmasından sorumludur.
                      Platform, kullanıcılar arasındaki
                      profesyonel ilişkinin kurulmasına
                      yardımcı olur.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      5. Yasaklı Kullanımlar
                    </h3>

                    <p>
                      Platform; yasa dışı faaliyetler,
                      dolandırıcılık, yanıltıcı bilgi paylaşımı,
                      başka kullanıcıların hesaplarına
                      yetkisiz erişim, taciz, tehdit veya
                      platformun güvenliğini tehlikeye
                      düşürecek faaliyetler amacıyla
                      kullanılamaz.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      6. İçerik ve Profil Bilgileri
                    </h3>

                    <p>
                      Kullanıcılar platforma yükledikleri
                      içeriklerin gerekli kullanım haklarına
                      sahip olduklarını kabul eder. Kullanıcı
                      tarafından sağlanan içeriklerin hukuka
                      uygunluğundan içeriği sağlayan kullanıcı
                      sorumludur.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      7. Hesabın Sonlandırılması
                    </h3>

                    <p>
                      CollaCrew, kullanım koşullarının ihlal
                      edilmesi veya platformun güvenliğinin
                      tehlikeye atılması halinde ilgili
                      hesabın kullanımını sınırlandırabilir
                      veya sonlandırabilir.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-gray-950">
                      8. Güncellemeler
                    </h3>

                    <p>
                      Kullanım Koşulları, platformun
                      geliştirilmesi veya yasal gereklilikler
                      nedeniyle güncellenebilir. Önemli
                      değişiklikler kullanıcıya uygun
                      kanallardan bildirilebilir.
                    </p>
                  </section>

                  <div className="rounded-xl bg-gray-50 p-4 text-xs leading-5 text-gray-500">
                    Bu metin CollaCrew için başlangıç kullanım
                    koşulları taslağıdır. Yayına alınmadan önce
                    işletmenin gerçek hukuki yapısına,
                    hizmet modeline, ödeme süreçlerine ve
                    kullanıcılar arasındaki sözleşme ilişkisine
                    göre hukuki olarak gözden geçirilmelidir.
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <span className="text-xs text-gray-400">
                Metin sürümü: v1
              </span>

              <button
                type="button"
                onClick={() =>
                  setActiveDocument(null)
                }
                className="rounded-xl bg-[var(--color-primary-600)] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-700)]"
              >
                Okudum, kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}