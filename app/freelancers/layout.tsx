import { AppShell } from "@/components/layout/AppShell";
import Sidebar from "./components/Sidebar";
import DashboardNavbar from "./components/DashboardNavbar";

/*
 * NOT: Bu layout, korumalı davet/proposal/dashboard sayfalarıyla birlikte
 * HERKESE AÇIK freelancer profil sayfasını da (`/freelancers/[username]`)
 * sarmalıyor. Bu yüzden burada `requireSession()` gibi path'ten bağımsız
 * bir sunucu tarafı guard KULLANILAMAZ — bu, herkese açık profilleri de
 * login'in arkasına kilitler.
 *
 * `/freelancers/*` altındaki gerçek koruma, path'e duyarlı şekilde
 * `proxy.ts` (proje kökü) içinde yapılıyor: bilinen korumalı segmentler
 * (dashboard, profile, proposals, vb.) login gerektirir, `[username]`
 * gibi tanınmayan tek segmentli path'ler (herkese açık profil) hariç
 * tutulur. app/client/layout.tsx için durum farklı: `/client/*` altında
 * herkese açık bir sayfa olmadığından orada `requireSession()` ek bir
 * sunucu tarafı katman olarak kullanılıyor.
 */
export default function FreelancersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell role="freelancer" sidebar={<Sidebar />} navbar={<DashboardNavbar />}>{children}</AppShell>;
}
