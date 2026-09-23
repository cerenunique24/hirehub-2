"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, User, X } from "lucide-react";
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

type AccountType = "individual" | "company";
type LegalDocument = "kvkk" | "terms" | null;

const ACCOUNT_TYPES = [
  {
    value: "individual",
    label: "Bireysel",
    icon: User,
    description: "Kendi adına proje oluştur ve freelancerlarla çalış.",
    points: ["Kişisel projeler", "Bireysel profil", "Freelancerlarla doğrudan çalışma"],
    confirmation: "Kendi adına proje oluşturabilir ve freelancerlarla bireysel olarak çalışabilirsin.",
    formTitle: "Kişisel bilgilerini ekle",
  },
  {
    value: "company",
    label: "Kurumsal",
    icon: Building2,
    description: "Şirketin adına proje oluştur ve ekiplerle çalış.",
    points: ["Şirket adına projeler", "Şirket adıyla profil", "Çok rollü projelerde ekip kurma"],
    confirmation: "Şirketin adına proje oluşturabilir ve kurumsal bilgilerini ekleyebilirsin.",
    formTitle: "Şirket bilgilerini ekle",
  },
] as const;

export default function ClientRegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accountType, setAccountType] =
    useState<AccountType | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] =
    useState(false);

  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [activeDocument, setActiveDocument] =
    useState<LegalDocument>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const passwordRules = useMemo(
    () => ({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    }),
    [password]
  );

  const passwordValid =
    passwordRules.length &&
    passwordRules.uppercase &&
    passwordRules.lowercase &&
    passwordRules.number;

  const passwordsMatch =
    passwordConfirm.length > 0 &&
    password === passwordConfirm;

  const emailValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const formValid =
    accountType !== null &&
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    emailValid &&
    passwordValid &&
    passwordsMatch &&
    kvkkAccepted &&
    termsAccepted &&
    (accountType === "individual" ||
      companyName.trim().length >= 2);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!formValid || loading || !accountType) return;

    setLoading(true);
    setErrorMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const acceptedAt = new Date().toISOString();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role: "client",
          account_type: accountType,
          company_name:
            accountType === "company"
              ? companyName.trim()
              : null,

              consent_kvkk_version: "v1",
              consent_terms_version: "v1",
              consent_kvkk_accepted_at: acceptedAt,
              consent_terms_accepted_at: acceptedAt,
        },

        emailRedirectTo: `${window.location.origin}/auth/callback?next=/client/dashboard`,
      },
    });

    if (error) {
      setErrorMessage(
        error.message === "User already registered"
          ? "Bu e-posta adresiyle zaten bir hesap bulunuyor."
          : error.message
      );

      setLoading(false);
      return;
    }

    if (!data.user) {
      setErrorMessage(
        "Hesap oluşturulamadı. Lütfen tekrar deneyin."
      );

      setLoading(false);
      return;
    }

    localStorage.setItem(
      "collacrew_client_signup_email",
      normalizedEmail
    );

    localStorage.setItem(
      "collacrew_client_signup_name",
      firstName.trim()
    );

    localStorage.setItem(
      "collacrew_client_account_type",
      accountType
    );

    localStorage.setItem(
      "collacrew_client_company_name",
      accountType === "company"
        ? companyName.trim()
        : ""
    );

    router.push("/register/client/verify");
  }

  const isCompany = accountType === "company";
  const selectedType = ACCOUNT_TYPES.find((type) => type.value === accountType) ?? null;

  return (
    <>
      <RegisterSplitLayout
        image="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1400&auto=format&fit=crop"
        eyebrow="Müşteri hesabı"
        title="Projen için doğru ekibi bul."
        description="Projelerini yayınla, yetenekleri keşfet ve ihtiyaçlarına uygun freelancerlarla çalış."
      >
        <RegisterFormHeader
          step={1}
          totalSteps={3}
          stepLabel="Hesap oluştur"
          title="Müşteri hesabını oluştur"
          description="Önce temel bilgilerini alalım. Profilini sonraki adımda birlikte tamamlayacağız."
        />

        <form onSubmit={handleSubmit} className="space-y-[var(--space-5)]">
          {/* MÜŞTERİ TÜRÜ */}
          <fieldset>
            <legend className="text-[15px] font-semibold leading-6 text-[var(--color-text-primary)]">
              Nasıl çalışacaksın?
            </legend>
            <p className="cc-body-sm mt-0.5 text-[var(--color-text-secondary)]">Proje ve hesap türünü seç.</p>

            <div role="radiogroup" aria-label="Hesap türü" className="mt-3 grid gap-2 sm:grid-cols-2">
              {ACCOUNT_TYPES.map((option) => {
                const selected = accountType === option.value;
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setAccountType(option.value)}
                    className={`relative flex flex-col rounded-[var(--radius-card)] border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-50)] ${
                      selected
                        ? "border-[var(--color-primary-600)] bg-[var(--color-primary-50)]/60 ring-1 ring-[var(--color-primary-600)]"
                        : "border-[var(--color-border-subtle)] bg-white hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] transition-colors ${
                          selected
                            ? "bg-[var(--color-primary-600)] text-white"
                            : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        <Icon size={16} />
                      </span>

                      <span
                        aria-hidden
                        className={`flex h-5 w-5 items-center justify-center rounded-[var(--radius-pill)] border transition-colors ${
                          selected
                            ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white"
                            : "border-[var(--color-border-strong)] bg-white text-transparent"
                        }`}
                      >
                        <Check size={12} strokeWidth={2.5} />
                      </span>
                    </div>

                    <span className="mt-3 text-sm font-semibold leading-5 text-[var(--color-text-primary)]">
                      {option.label}
                    </span>
                    <span className="mt-1 text-[13px] leading-5 text-[var(--color-text-secondary)]">
                      {option.description}
                    </span>

                    <ul className="mt-3 space-y-1.5 border-t border-[var(--color-border-subtle)] pt-3">
                      {option.points.map((point) => (
                        <li key={point} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                          <Check
                            size={12}
                            className={selected ? "text-[var(--color-primary-600)]" : "text-[var(--color-text-muted)]"}
                          />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <p aria-live="polite" className="mt-2 min-h-[18px] text-xs text-[var(--color-text-secondary)]">
              {selectedType?.confirmation ?? ""}
            </p>
          </fieldset>

          {/* SEÇİME GÖRE ALANLAR */}
          {selectedType && (
            <section key={selectedType.value} className="cc-appear space-y-3" aria-label={selectedType.formTitle}>
              <h2 className="text-[15px] font-semibold leading-6 text-[var(--color-text-primary)]">
                {selectedType.formTitle}
              </h2>

              {isCompany && (
                <RegisterField label="Şirket adı" htmlFor="companyName">
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Şirketinizin adı"
                    autoComplete="organization"
                  />
                </RegisterField>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <RegisterField label={isCompany ? "Yetkili adı" : "Ad"} htmlFor="firstName">
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Adınız"
                    autoComplete="given-name"
                  />
                </RegisterField>

                <RegisterField label={isCompany ? "Yetkili soyadı" : "Soyad"} htmlFor="lastName">
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Soyadınız"
                    autoComplete="family-name"
                  />
                </RegisterField>
              </div>

              <RegisterField label={isCompany ? "İş e-postası" : "E-posta"} htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isCompany ? "ad@sirket.com" : "ornek@email.com"}
                  autoComplete="email"
                />
              </RegisterField>

              <RegisterField label="Şifre" htmlFor="password">
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 8 karakter"
                  autoComplete="new-password"
                  visible={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                />

                {password.length > 0 && !passwordValid && (
                  <PasswordChecklist
                    rules={[
                      { label: "En az 8 karakter", valid: passwordRules.length },
                      { label: "En az 1 büyük harf", valid: passwordRules.uppercase },
                      { label: "En az 1 küçük harf", valid: passwordRules.lowercase },
                      { label: "En az 1 rakam", valid: passwordRules.number },
                    ]}
                  />
                )}

                {passwordValid && (
                  <p className="mt-1.5 text-xs text-[var(--color-success-600)]">Güçlü bir şifre oluşturdun.</p>
                )}
              </RegisterField>

              <RegisterField
                label="Şifre tekrar"
                htmlFor="passwordConfirm"
                hint={
                  passwordConfirm.length > 0
                    ? passwordsMatch
                      ? "Şifreler eşleşiyor."
                      : "Şifreler eşleşmiyor."
                    : undefined
                }
                hintTone={passwordsMatch ? "success" : "error"}
              >
                <PasswordInput
                  id="passwordConfirm"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Şifreni tekrar gir"
                  autoComplete="new-password"
                  hasError={passwordConfirm.length > 0 && !passwordsMatch}
                  visible={showPasswordConfirm}
                  onToggle={() => setShowPasswordConfirm((value) => !value)}
                />
              </RegisterField>
            </section>
          )}

          {/* ONAYLAR */}
          {selectedType && (
            <div className="cc-appear">
              <ConsentGroup
                kvkk={kvkkAccepted}
                terms={termsAccepted}
                onKvkkChange={setKvkkAccepted}
                onTermsChange={setTermsAccepted}
                onOpenDocument={setActiveDocument}
              />
            </div>
          )}

          {/* HATA */}
          {errorMessage && (
            <div className="cc-body-sm rounded-[var(--radius-input)] border border-red-200 bg-[var(--color-error-50)] px-3 py-2.5 text-[var(--color-error-600)]">
              {errorMessage}
            </div>
          )}

          {/* KAYIT */}
          <div className="space-y-3">
            {selectedType ? (
              <Button type="submit" size="lg" disabled={!formValid || loading} loading={loading} className="w-full">
                {loading ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
                {!loading && <ArrowRight size={16} />}
              </Button>
            ) : (
              <p className="cc-body-sm rounded-[var(--radius-input)] border border-dashed border-[var(--color-border-strong)] px-3 py-2.5 text-center text-[var(--color-text-muted)]">
                Devam etmek için hesap türünü seç.
              </p>
            )}

            <p className="cc-body-sm text-center text-[var(--color-text-secondary)]">
              Zaten hesabın var mı?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="font-medium text-[var(--color-primary-600)] hover:underline"
              >
                Giriş yap
              </button>
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
                      3. Freelancerlar
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

