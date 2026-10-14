import { AppShell } from "@/components/layout/AppShell";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { requireSession } from "@/lib/auth/session";


export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sunucu tarafı oturum kontrolü — oturum yoksa /login'e yönlendirir.
  // Bu, sadece Sidebar'ın client-side yönlendirmesine güvenmek yerine,
  // korumalı içeriğin oturumsuz kullanıcıya hiç render edilmemesini sağlar.
  await requireSession("client");

  return <AppShell role="client" sidebar={<Sidebar />} navbar={<Navbar />}>{children}</AppShell>;
}
