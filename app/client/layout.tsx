import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import PageContainer from "@/components/layout/PageContainer";
import { requireSession } from "@/lib/auth/session";


export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sunucu tarafı oturum kontrolü — oturum yoksa /login'e yönlendirir.
  // Bu, sadece Sidebar'ın client-side yönlendirmesine güvenmek yerine,
  // korumalı içeriğin oturumsuz kullanıcıya hiç render edilmemesini sağlar.
  await requireSession();

  return (

    <div className="flex min-h-screen bg-[var(--color-canvas)]">


      <Sidebar />


      <div className="flex min-w-0 flex-1 flex-col">


        <Navbar />


        <main className="panel-main min-w-0 flex-1 overflow-x-hidden">
          <PageContainer>{children}</PageContainer>
        </main>


      </div>


    </div>

  );

}
