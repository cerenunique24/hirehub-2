import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/client", "/freelancers"];

/**
 * Kök sebep düzeltmesi: uygulamada hiç middleware yoktu, bu yüzden
 * `/client/**` ve `/freelancers/**` sayfaları oturum olmadan da
 * render ediliyordu (sayfa içindeki component kendi içinde bir hata
 * mesajı gösteriyordu ama gerçek bir yönlendirme hiç olmuyordu).
 * Bu middleware her istekte Supabase session'ını yeniler ve
 * korumalı alanlara girişte gerçek bir server-side redirect yapar.
 */
export async function proxy(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/client/:path*", "/freelancers/:path*"],
};
