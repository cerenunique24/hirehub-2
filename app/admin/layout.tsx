"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  LifeBuoy,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const menu = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Kullanıcılar", href: "/admin/users", icon: Users },
  { label: "Projeler", href: "/admin/projects", icon: FolderKanban },
  { label: "Destek Talepleri", href: "/admin/support", icon: LifeBuoy },
  { label: "Ödemeler", href: "/admin/payments", icon: CreditCard },
  { label: "Teklifler", href: "/admin/proposals", icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    let active = true;

    const checkAdmin = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: admin } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!admin) {
        router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name,last_name")
        .eq("id", user.id)
        .maybeSingle();

      if (active) {
        setAdminName(
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
            user.email?.split("@")[0] ||
            "Admin"
        );
        setChecking(false);
      }
    };

    checkAdmin();

    return () => {
      active = false;
    };
  }, [router]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7]">
        <div className="text-sm text-neutral-500">Admin paneli yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f7f7f7] text-neutral-900">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-neutral-200 bg-white">
        <div className="flex h-20 items-center gap-3 border-b border-neutral-200 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
            C
          </div>
          <div>
            <div className="text-[17px] font-bold">CollaCrew</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
              Admin
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {menu.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-black text-white"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-200 p-4">
          <Link
            href="/admin/settings"
            className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            <Settings size={18} strokeWidth={1.8} />
            Ayarlar
          </Link>

          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-500 hover:bg-red-50"
          >
            <LogOut size={18} strokeWidth={1.8} />
            Çıkış Yap
          </button>

          <div className="mt-4 flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{adminName}</p>
              <p className="text-xs text-neutral-500">Yönetici</p>
            </div>
            <ChevronDown size={15} className="text-neutral-400" />
          </div>
        </div>
      </aside>

      <div className="ml-[250px] min-h-screen flex-1">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-neutral-200 bg-white/95 px-8 backdrop-blur">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
              Yönetim Paneli
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              CollaCrew operasyon merkezi
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Sistem aktif
          </div>
        </header>

        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
