import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionRole = "freelancer" | "client";

export interface AuthedSession {
  userId: string;
  role: SessionRole | null;
  supabase: SupabaseClient;
}

/**
 * Server Component / layout guard.
 *
 * `proxy.ts` (proje kökü) zaten `/client/*` ve `/freelancers/*` altındaki
 * korumalı sayfalara oturumsuz erişimi login'e yönlendirerek engelliyor.
 * Bu fonksiyon AYNI kontrolü render zamanında (server component katmanında)
 * tekrar yapar — proxy matcher'ı gelecekte kapsam dışı kalırsa (ör. yeni
 * bir route eklenip matcher güncellenmezse) bile korumalı layout'lar hiçbir
 * içeriği oturumsuz kullanıcıya göstermez. Tek yetkilendirme sınırı olarak
 * client-side yönlendirmeye güvenilmez.
 */
export async function requireSession(): Promise<AuthedSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    profile?.role === "freelancer" || profile?.role === "client"
      ? profile.role
      : null;

  return { userId: user.id, role, supabase };
}
