import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");

  const requestedNext =
    requestUrl.searchParams.get("next") ||
    "/register/freelancer/setup";

  const allowedPaths = [
    "/register/freelancer/setup",
    "/client/dashboard",
  ];

  const allowedNext = allowedPaths.includes(requestedNext)
    ? requestedNext
    : "/register/freelancer/setup";

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=verification_failed",
        requestUrl.origin
      )
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                cookieStore.set(name, value, options);
              }
            );
          } catch {}
        },
      },
    }
  );

  const { error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        "/login?error=verification_failed",
        requestUrl.origin
      )
    );
  }

  /*
   * `next` az önce yalnızca sabit bir allowlist'ten seçildi, ama yine de
   * sadece istemcinin gönderdiği bir değer — gerçek yetkilendirme kararı
   * değil. Kullanıcının GERÇEK rolünü burada, kendi `profiles` satırından
   * okuyup `next` ile karşılaştırıyoruz: biri diğeriyle çelişirse (ör.
   * bir client linki bir freelancer hesabıyla açılırsa) rol her zaman
   * kazanır. Rol tanımlı değilse (profil satırı henüz oluşmadıysa)
   * `next`'e güvenmeye devam ederiz — sonraki adımlarda ilgili panel zaten
   * kendi oturum/rol kontrolünü ayrıca yapar.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destination = allowedNext;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "client" && allowedNext !== "/client/dashboard") {
      destination = "/client/dashboard";
    } else if (
      profile?.role === "freelancer" &&
      allowedNext === "/client/dashboard"
    ) {
      destination = "/register/freelancer/setup";
    }
  }

  return NextResponse.redirect(
    new URL(destination, requestUrl.origin)
  );
}
