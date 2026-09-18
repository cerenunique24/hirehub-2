"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  User,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AccountType = "individual" | "company";
type LegalDocument = "kvkk" | "terms" | null;

export default function ClientRegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accountType, setAccountType] =
    useState<AccountType>("individual");
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

    if (!formValid || loading) return;

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

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <div className="min-h-screen grid lg:grid-cols-[0.9fr_1.1fr]">
        {/* SOL PANEL */}
        <section className="hidden lg:flex bg-black text-white p-12 xl:p-16 flex-col justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight">
              CollaCrew
            </div>

            <div className="mt-24 max-w-md">
              <p className="text-sm text-white/50 mb-5">
                Müşteri hesabı
              </p>

              <h1 className="text-5xl xl:text-6xl font-semibold tracking-tight leading-[1.02]">
                Projen için
                <br />
                doğru ekibi bul.
              </h1>

              <p className="mt-7 text-white/60 text-base leading-7 max-w-sm">
                Projelerini yayınla, yetenekleri keşfet ve
                ihtiyaçlarına uygun freelancerlarla çalış.
              </p>
            </div>
          </div>

          <div className="text-sm text-white/40">
            © {new Date().getFullYear()} CollaCrew
          </div>
        </section>

        {/* SAĞ PANEL */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-xl">
            <div className="mb-8">
              <div className="flex items-center gap-2 text-xs font-medium text-black/40 mb-5">
                <span className="text-black">01</span>
                <span>/</span>
                <span>03</span>
                <span className="ml-2">
                  Hesap oluştur
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Müşteri hesabını oluştur
              </h2>

              <p className="mt-3 text-black/50 leading-6">
                Önce temel bilgilerini alalım. Profilini
                sonraki adımda birlikte tamamlayacağız.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* AD SOYAD */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ad
                  </label>

                  <input
                    value={firstName}
                    onChange={(e) =>
                      setFirstName(e.target.value)
                    }
                    placeholder="Adınız"
                    autoComplete="given-name"
                    className="w-full h-12 rounded-xl border border-black/10 bg-white px-4 outline-none focus:border-black transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Soyad
                  </label>

                  <input
                    value={lastName}
                    onChange={(e) =>
                      setLastName(e.target.value)
                    }
                    placeholder="Soyadınız"
                    autoComplete="family-name"
                    className="w-full h-12 rounded-xl border border-black/10 bg-white px-4 outline-none focus:border-black transition"
                  />
                </div>
              </div>

              {/* HESAP TÜRÜ */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Hesap türün
                </label>

                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setAccountType("individual")
                    }
                    className={`text-left rounded-2xl border p-5 transition ${
                      accountType === "individual"
                        ? "border-black bg-white ring-1 ring-black"
                        : "border-black/10 bg-white hover:border-black/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-11 h-11 rounded-xl bg-black/[0.04] flex items-center justify-center">
                        <User size={21} />
                      </div>

                      {accountType === "individual" && (
                        <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center">
                          <Check size={14} />
                        </div>
                      )}
                    </div>

                    <h3 className="mt-5 font-semibold">
                      Bireysel
                    </h3>

                    <ul className="mt-3 space-y-2 text-sm text-black/50">
                      <li>• Kendi adına proje oluştur</li>
                      <li>• Freelancerlarla doğrudan çalış</li>
                      <li>• Kişisel projelerini yönet</li>
                    </ul>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAccountType("company")
                    }
                    className={`text-left rounded-2xl border p-5 transition ${
                      accountType === "company"
                        ? "border-black bg-white ring-1 ring-black"
                        : "border-black/10 bg-white hover:border-black/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-11 h-11 rounded-xl bg-black/[0.04] flex items-center justify-center">
                        <Building2 size={21} />
                      </div>

                      {accountType === "company" && (
                        <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center">
                          <Check size={14} />
                        </div>
                      )}
                    </div>

                    <h3 className="mt-5 font-semibold">
                      Şirket
                    </h3>

                    <ul className="mt-3 space-y-2 text-sm text-black/50">
                      <li>• Şirket adına proje oluştur</li>
                      <li>• Ekip olarak projeleri yönet</li>
                      <li>• Kurumsal iş süreçlerini yönet</li>
                    </ul>
                  </button>
                </div>
              </div>

              {/* ŞİRKET ADI */}
              {accountType === "company" && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Şirket adı
                  </label>

                  <input
                    value={companyName}
                    onChange={(e) =>
                      setCompanyName(e.target.value)
                    }
                    placeholder="Şirketinizin adı"
                    autoComplete="organization"
                    className="w-full h-12 rounded-xl border border-black/10 bg-white px-4 outline-none focus:border-black transition"
                  />
                </div>
              )}

              {/* E-POSTA */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  E-posta
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="ornek@email.com"
                  autoComplete="email"
                  className="w-full h-12 rounded-xl border border-black/10 bg-white px-4 outline-none focus:border-black transition"
                />
              </div>

              {/* ŞİFRE */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Şifre
                  </label>

                  <div className="relative">
                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full h-12 rounded-xl border border-black/10 bg-white px-4 pr-12 outline-none focus:border-black transition"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Şifreyi gizle"
                          : "Şifreyi göster"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Şifre tekrar
                  </label>

                  <div className="relative">
                    <input
                      type={
                        showPasswordConfirm
                          ? "text"
                          : "password"
                      }
                      value={passwordConfirm}
                      onChange={(e) =>
                        setPasswordConfirm(
                          e.target.value
                        )
                      }
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full h-12 rounded-xl border border-black/10 bg-white px-4 pr-12 outline-none focus:border-black transition"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswordConfirm(
                          (value) => !value
                        )
                      }
                      aria-label={
                        showPasswordConfirm
                          ? "Şifreyi gizle"
                          : "Şifreyi göster"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black"
                    >
                      {showPasswordConfirm ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {passwordConfirm.length > 0 && (
                    <p
                      className={`mt-2 text-xs ${
                        passwordsMatch
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {passwordsMatch
                        ? "Şifreler eşleşiyor."
                        : "Şifreler eşleşmiyor."}
                    </p>
                  )}
                </div>
              </div>

              {/* ŞİFRE KURALLARI */}
              {password.length > 0 &&
                !passwordValid && (
                  <div className="rounded-xl bg-white border border-black/5 p-4">
                    <p className="text-xs font-medium mb-3">
                      Şifre gereksinimleri
                    </p>

                    <div className="grid sm:grid-cols-2 gap-2 text-xs">
                      <PasswordRule
                        valid={passwordRules.length}
                        text="En az 8 karakter"
                      />

                      <PasswordRule
                        valid={passwordRules.uppercase}
                        text="En az 1 büyük harf"
                      />

                      <PasswordRule
                        valid={passwordRules.lowercase}
                        text="En az 1 küçük harf"
                      />

                      <PasswordRule
                        valid={passwordRules.number}
                        text="En az 1 rakam"
                      />
                    </div>
                  </div>
                )}

              {passwordValid && (
                <p className="text-xs text-green-600">
                  Güçlü bir şifre oluşturdun.
                </p>
              )}

              {/* ONAYLAR */}
              <div className="space-y-3 rounded-2xl border border-black/5 bg-white p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kvkkAccepted}
                    onChange={(e) =>
                      setKvkkAccepted(e.target.checked)
                    }
                    className="mt-1 w-4 h-4 accent-black"
                  />

                  <span className="text-sm text-black/60 leading-5">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDocument("kvkk")
                      }
                      className="font-medium text-black underline underline-offset-2 hover:text-black/60"
                    >
                      KVKK Aydınlatma Metni
                    </button>{" "}
                    &apos;ni okudum ve anladım.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) =>
                      setTermsAccepted(e.target.checked)
                    }
                    className="mt-1 w-4 h-4 accent-black"
                  />

                  <span className="text-sm text-black/60 leading-5">
                    CollaCrew{" "}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDocument("terms")
                      }
                      className="font-medium text-black underline underline-offset-2 hover:text-black/60"
                    >
                      Kullanım Koşulları
                    </button>
                    &apos;nı kabul ediyorum.
                  </span>
                </label>
              </div>

              {/* HATA */}
              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {errorMessage}
                </div>
              )}

              {/* KAYIT */}
              <button
                type="submit"
                disabled={!formValid || loading}
                className="w-full h-13 rounded-xl bg-black text-white font-medium flex items-center justify-center gap-2 transition disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/90"
              >
                {loading
                  ? "Hesap oluşturuluyor..."
                  : "Hesap Oluştur"}

                {!loading && <ArrowRight size={18} />}
              </button>

              <p className="text-center text-sm text-black/40">
                Zaten hesabın var mı?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-black font-medium hover:underline"
                >
                  Giriş yap
                </button>
              </p>
            </form>
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

function PasswordRule({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        valid ? "text-green-600" : "text-black/40"
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center ${
          valid ? "bg-green-100" : "bg-black/5"
        }`}
      >
        {valid && <Check size={11} />}
      </div>

      {text}
    </div>
  );
}
