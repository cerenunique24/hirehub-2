import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSessionRole, panelHome, type SessionRole } from "@/lib/auth/roles";

export type { SessionRole } from "@/lib/auth/roles";

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
export async function requireSession(expectedRole?: SessionRole): Promise<AuthedSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // İkinci savunma katmanı — `proxy.ts` bunu zaten erken engeller, ama bu
  // dosyanın kendi amacı gereği (yukarıdaki not) burada da tekrarlanır.
  // `email_confirmed_at` Supabase Auth'un kendi alanıdır, client tarafından
  // değiştirilemez.
  if (!user.email_confirmed_at) {
    const params = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
    redirect(`/auth/verify-email${params}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = normalizeSessionRole(profile?.role);

  // profiles.role is canonical; known opposite roles cannot render this panel.
  // Unknown/special roles retain the existing behavior.
  if (expectedRole && role && role !== expectedRole) {
    redirect(panelHome(role));
  }

  return { userId: user.id, role, supabase };
}
