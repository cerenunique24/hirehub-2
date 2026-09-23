"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  LifeBuoy,
  Briefcase,
  Settings,
  LogOut,
  ShieldAlert,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type AdminMenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

const MAIN_MENU: AdminMenuItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Kullanıcılar", href: "/admin/users", icon: Users },
  { name: "Projeler", href: "/admin/projects", icon: FolderKanban },
  { name: "Teklifler", href: "/admin/proposals", icon: FileText },
  { name: "Destek Talepleri", href: "/admin/support", icon: LifeBuoy },
  { name: "Kariyer Başvuruları", href: "/admin/careers", icon: Briefcase },
  { name: "Moderasyon", href: "/admin/moderation", icon: ShieldAlert },
];

const BOTTOM_MENU: AdminMenuItem[] = [
  { name: "Ayarlar", href: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex min-h-screen w-[220px] shrink-0 flex-col border-r border-[#e5e7eb] bg-white">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[#e5e7eb] px-5">
        <div className="min-w-0 leading-tight">
          <Image src="/logo.png" alt="CollaCrew" width={110} height={21} priority />
          <p className="mt-1 truncate text-xs text-[#6b7280]">Yönetim Paneli</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-4">
        <div className="space-y-0.5">
          {MAIN_MENU.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={[
                  "flex h-9 items-center gap-2.5 px-3 text-sm transition-colors",
                  active
                    ? "bg-[#EFF6FF] font-medium text-[#2563EB]"
                    : "text-[#4B5563] hover:bg-[#F7F7F8] hover:text-[#111111]",
                ].join(" ")}
              >
                <Icon size={16} strokeWidth={1.8} className="shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-[#e5e7eb] px-3 py-4">
        <div className="space-y-0.5">
          {BOTTOM_MENU.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={[
                  "flex h-9 items-center gap-2.5 px-3 text-sm transition-colors",
                  active
                    ? "bg-[#EFF6FF] font-medium text-[#2563EB]"
                    : "text-[#4B5563] hover:bg-[#F7F7F8] hover:text-[#111111]",
                ].join(" ")}
              >
                <Icon size={16} strokeWidth={1.8} className="shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex h-9 w-full items-center gap-2.5 px-3 text-sm text-[#4B5563] transition-colors hover:bg-[#F7F7F8] hover:text-[#DC2626]"
          >
            <LogOut size={16} strokeWidth={1.8} className="shrink-0" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
