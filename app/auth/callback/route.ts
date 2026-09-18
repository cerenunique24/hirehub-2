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

  return NextResponse.redirect(
    new URL(allowedNext, requestUrl.origin)
  );
}
