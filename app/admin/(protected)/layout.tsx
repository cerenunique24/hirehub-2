import AdminSidebar from "./components/Sidebar";
import { requireAdminSession } from "@/lib/auth/admin";

/**
 * CollaCrew Admin — kök layout.
 *
 * `requireAdminSession()` hem oturum kontrolü yapar (oturum yoksa
 * `/login`) hem de `admin_users` tablosuna göre gerçek admin
 * yetkilendirmesi uygular (admin değilse kendi paneline yönlendirir).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <div className="flex min-h-screen bg-[#F7F7F8]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
