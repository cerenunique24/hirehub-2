"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Bu sayfa artık kullanılmıyor — kayıt akışı doğrudan ortak
 * `/auth/verify-email` (6 haneli OTP) sayfasına yönlendiriyor
 * (bkz. app/register/client/page.tsx). Bu route, eski/bookmark'lanmış
 * bir bağlantıyla buraya gelen kullanıcıları kırmamak için sadece
 * uyumluluk amaçlı yönlendirme yapıyor.
 */
export default function ClientVerifyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const storedEmail = window.localStorage.getItem(
      "collacrew_client_signup_email"
    );

    router.replace(
      storedEmail
        ? `/auth/verify-email?email=${encodeURIComponent(storedEmail)}`
        : "/auth/verify-email"
    );
  }, [router]);

  return null;
}
