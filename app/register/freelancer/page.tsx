"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
    <main className="h-screen w-full overflow-hidden bg-white">
      <div className="grid h-screen w-full lg:grid-cols-[42%_58%]">
        {/* SOL PANEL */}
        <section className="hidden h-screen bg-black text-white lg:flex lg:flex-col lg:justify-between">
          <div className="px-12 pt-12 xl:px-16 xl:pt-14">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-lg font-bold text-black">
              C
            </div>

            <div className="mt-20 xl:mt-24">
              <p className="text-xs font-semibold tracking-[0.2em] text-white/40">
                FREELANCER KAYDI
              </p>

              <h2 className="mt-6 text-5xl font-semibold leading-[1.04] tracking-tight xl:text-6xl">
                Yeteneğini
                <br />
                doğru projeyle
                <br />
                buluştur.
              </h2>

              <p className="mt-7 max-w-md text-base leading-7 text-white/55">
                CollaCrew&apos;da uzmanlığını göster,
                doğru projeleri keşfet ve müşterilerle
                birlikte çalış.
              </p>
            </div>
          </div>

          <div className="px-12 pb-12 xl:px-16 xl:pb-14">
            <div className="space-y-4">
              {[
                "Profilini oluştur",
                "Sana uygun projeleri keşfet",
                "Müşterilerle çalış",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-black">
                    <Check
                      size={14}
                      strokeWidth={2.5}
                    />
                  </div>

                  <span className="text-sm text-white/65">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SAĞ PANEL */}
        <section className="h-screen overflow-y-auto">
          <div className="flex min-h-full w-full items-start justify-center px-6 py-8 sm:px-10 sm:py-10 xl:px-16 xl:py-12">
            <div className="w-full max-w-3xl">
              {/* MOBİL LOGO */}
              <div className="mb-8 flex items-center justify-between lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-sm font-bold text-white">
                  C
                </div>

                <span className="text-xs font-medium text-gray-400">
                  Freelancer kaydı
                </span>
              </div>

              {/* HEADER */}
              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                    Adım 1 / 3
                  </span>

                  <span className="text-xs text-gray-400">
                    Hesap oluştur
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full w-1/3 rounded-full bg-black" />
                </div>

                <h1 className="mt-7 text-3xl font-semibold tracking-tight text-gray-950 sm:text-[34px]">
                  Freelancer hesabını oluştur
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                  Hesabını oluşturduktan sonra e-posta
                  adresini doğrulayacak ve profesyonel
                  profilini tamamlayacaksın.
                </p>
              </div>

              {/* FORM */}
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* AD SOYAD */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-800">
                      Ad
                    </label>

                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="Adın"
                      autoComplete="given-name"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/5"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-800">
                      Soyad
                    </label>

                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="Soyadın"
                      autoComplete="family-name"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                </div>

                {/* E-POSTA */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    E-posta
                  </label>

                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="ornek@email.com"
                    autoComplete="email"
                    className={`h-12 w-full rounded-xl border bg-white px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-black/5 ${
                      !emailValid
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-200 focus:border-black"
                    }`}
                  />

                  {!emailValid && (
                    <p className="mt-2 text-xs text-red-500">
                      Geçerli bir e-posta adresi gir.
                    </p>
                  )}
                </div>

                {/* ŞİFRE */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    Şifre
                  </label>

                  <div className="relative">
                    <input
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Şifreni oluştur"
                      autoComplete="new-password"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/5"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (prev) => !prev
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Şifreyi gizle"
                          : "Şifreyi göster"
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-black"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {form.password.length > 0 &&
                    !passwordValid && (
                      <div className="mt-3 rounded-xl bg-gray-50 p-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {passwordRules.map(
                            (rule) => (
                              <div
                                key={rule.label}
                                className="flex items-center gap-2"
                              >
                                <div
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                    rule.valid
                                      ? "bg-green-500 text-white"
                                      : "bg-gray-200 text-gray-400"
                                  }`}
                                >
                                  <Check size={11} />
                                </div>

                                <span
                                  className={`text-xs ${
                                    rule.valid
                                      ? "text-gray-900"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {rule.label}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {passwordValid &&
                    form.password.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-xs font-medium text-green-600">
                        <Check size={14} />
                        Güçlü bir şifre oluşturdun.
                      </div>
                    )}
                </div>

                {/* ŞİFRE TEKRAR */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    Şifre Tekrar
                  </label>

                  <div className="relative">
                    <input
                      name="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Şifreni tekrar gir"
                      autoComplete="new-password"
                      className={`h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-black/5 ${
                        form.confirmPassword.length > 0
                          ? passwordsMatch
                            ? "border-green-400 focus:border-green-500"
                            : "border-red-300 focus:border-red-500"
                          : "border-gray-200 focus:border-black"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (prev) => !prev
                        )
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Şifreyi gizle"
                          : "Şifreyi göster"
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-black"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {form.confirmPassword.length > 0 && (
                    <div
                      className={`mt-2 flex items-center gap-2 text-xs font-medium ${
                        passwordsMatch
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      <Check size={14} />

                      {passwordsMatch
                        ? "Şifreler eşleşiyor."
                        : "Şifreler eşleşmiyor."}
                    </div>
                  )}
                </div>

                {/* ONAYLAR */}
                <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  {/* KVKK */}
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={acceptKvkk}
                      onChange={(e) =>
                        setAcceptKvkk(
                          e.target.checked
                        )
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-black"
                    />

                    <span className="text-xs leading-5 text-gray-600">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveDocument("kvkk")
                        }
                        className="font-medium text-gray-900 underline underline-offset-2 transition hover:text-gray-500"
                      >
                        KVKK Aydınlatma Metni
                      </button>{" "}
                      &apos;ni okudum ve anladım.
                    </span>
                  </label>

                  {/* KULLANIM KOŞULLARI */}
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) =>
                        setAcceptTerms(
                          e.target.checked
                        )
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-black"
                    />

                    <span className="text-xs leading-5 text-gray-600">
                      CollaCrew{" "}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveDocument("terms")
                        }
                        className="font-medium text-gray-900 underline underline-offset-2 transition hover:text-gray-500"
                      >
                        Kullanım Koşulları
                      </button>
                      &apos;nı kabul ediyorum.
                    </span>
                  </label>
                </div>

                {/* GÜVENLİK */}
                <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-4">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-gray-500"
                  />

                  <p className="text-xs leading-5 text-gray-500">
                    Hesabını oluşturduktan sonra
                    e-posta adresini doğrulaman gerekecek.
                    Böylece hesabının sana ait olduğunu
                    doğrulayabiliriz.
                  </p>
                </div>

                {/* HATA */}
                {error && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-600">
                    {error}
                  </div>
                )}

                {/* DEVAM */}
                <button
                  type="submit"
                  disabled={!formValid || loading}
                  className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition ${
                    formValid && !loading
                      ? "bg-black text-white hover:bg-gray-800"
                      : "cursor-not-allowed bg-gray-100 text-gray-400"
                  }`}
                >
                  {loading
                    ? "Hesap oluşturuluyor..."
                    : "Devam Et"}

                  {!loading && formValid && (
                    <ArrowRight size={17} />
                  )}
                </button>

                {!formValid && !loading && (
                  <p className="text-center text-xs text-gray-400">
                    Devam etmek için tüm bilgileri
                    tamamla ve gerekli onayları ver.
                  </p>
                )}
              </form>
            </div>
          </div>
        </section>
      </div>

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
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                  CollaCrew
                </p>

                <h2
                  id="legal-document-title"
                  className="mt-1 text-xl font-semibold tracking-tight text-gray-950"
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
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-black"
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
              <span className="text-[11px] text-gray-400">
                Metin sürümü: v1
              </span>

              <button
                type="button"
                onClick={() =>
                  setActiveDocument(null)
                }
                className="rounded-xl bg-black px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-800"
              >
                Okudum, kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}