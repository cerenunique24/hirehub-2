import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isProtectedPanelPath, normalizeSessionRole, resolvePanelAccess } from "@/lib/auth/roles";

/*
 * Bu proje Next.js 16 kullanıyor; `middleware.ts` artık deprecated ve
 * yerini `proxy.ts` aldı (bkz. node_modules/next/dist/docs/.../proxy.md).
 * Davranış aynı: her istekten önce, sayfa render edilmeden çalışır.
 *
 * Amaç: `/client/*` ve `/freelancers/*` altındaki korumalı alanlara
 * oturumsuz erişimi, sayfa hiç render edilmeden burada engellemek.
 * Önceden bu kontrol sadece her sidebar bileşeninin kendi
 * `useEffect` içinde yaptığı client-side `router.replace("/login")`
 * çağrısına bırakılmıştı — freelancer sidebar'ı bunu yapıyordu, client
 * sidebar'ı yapmıyordu (bkz. COLLACREW_AUDIT_CONTEXT.md §7/§27/§28) ve
 * ikisi de sayfa içeriği bir an için render edildikten SONRA devreye
 * giriyordu. Bu, bir güvenlik sınırı değildi.
 *
 * Bu dosya o sınırı değiştirmez — hâlâ her API route kendi
 * `auth.getUser()` kontrolünü yapmaya devam eder ve RLS aktif kalır.
 * Bu sadece EK bir katman: sayfa isteklerini erken, tutarlı şekilde
 * yönlendirir. (Next.js'in kendi proxy dokümantasyonu da bunu tavsiye
 * ediyor: "Always verify authentication and authorization inside each
 * Server Function rather than relying on Proxy alone.")
 */

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/client" || pathname.startsWith("/client/")) {
    return true;
  }

  // `/admin/login` kasıtlı olarak hariç: admin'e özgü, ayrı giriş
  // ekranı oturumsuz erişilebilir olmalı (bkz. app/admin/login).
  if (pathname === "/admin" || (pathname.startsWith("/admin/") && pathname !== "/admin/login")) {
    return true;
  }

  if (pathname.startsWith("/freelancers/")) {
    return isProtectedPanelPath(pathname);
  }

  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // `getSession()` yerine `getUser()` kullanılıyor: `getUser()` JWT'yi
  // Supabase Auth sunucusuna karşı yeniden doğrular, `getSession()` ise
  // sadece cookie'deki (sahte olabilecek) veriyi okur.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL(pathname.startsWith("/admin") ? "/admin/login" : "/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // E-posta doğrulama zorunluluğu client/freelancer panellerine özeldir —
  // admin hesapları ayrı bir yönetim akışıyla (Supabase dashboard'dan)
  // oluşturulur ve bu tüketici sign-up doğrulama akışına tabi değildir.
  // `email_confirmed_at` Supabase Auth'un kendi, sunucu tarafında
  // doğrulanan alanıdır — client tarafından değiştirilebilecek hiçbir
  // veriye (localStorage, cookie, query param) güvenilmez.
  if (!pathname.startsWith("/admin") && !user.email_confirmed_at) {
    const verifyUrl = new URL("/auth/verify-email", request.url);
    if (user.email) verifyUrl.searchParams.set("email", user.email);
    return NextResponse.redirect(verifyUrl);
  }

  if (pathname.startsWith("/client/") || pathname.startsWith("/freelancers/")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const destination = resolvePanelAccess(pathname, {
      authenticated: true,
      emailConfirmed: true,
      role: normalizeSessionRole(profile?.role),
    });

    if (destination) {
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/client/:path*", "/freelancers/:path*", "/admin/:path*"],
};
