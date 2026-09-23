import Sidebar from "./components/Sidebar";
import DashboardNavbar from "./components/DashboardNavbar";
import PageContainer from "@/components/layout/PageContainer";

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
  return (
    <div className="flex min-h-screen bg-[var(--color-canvas)]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardNavbar />

        <main className="panel-main min-w-0 flex-1 overflow-x-hidden">
          <PageContainer>{children}</PageContainer>
        </main>
      </div>
    </div>
  );
}
