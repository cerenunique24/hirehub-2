"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UsersRound,
  FileText,
  CreditCard,
  Sparkles,
  Settings,
  Plus,
  LogOut,
  CircleHelp,
  UserRound,
  MessageCircle,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useSidebarCounts } from "@/lib/hooks/useSidebarCounts";

type MenuItem = {
  name: string;
  href: string;
  icon: React.ElementType;
};

const menuGroups: MenuItem[][] = [
  [
    {
      name: "Panel",
      href: "/client/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Proje Oluştur",
      href: "/client/projects/new",
      icon: Plus,
    },
  ],
  [
    {
      name: "Freelancerlar",
      href: "/client/freelancers",
      icon: Users,
    },
    {
      name: "Projelerim",
      href: "/client/projects",
      icon: FolderKanban,
    },
    {
      name: "Tekliflerim",
      href: "/client/proposals",
      icon: FileText,
    },
    {
      name: "Koalisyonlar",
      href: "/client/coalitions",
      icon: UsersRound,
    },
    {
      name: "Ödemeler",
      href: "/client/payments",
      icon: CreditCard,
    },
    {
      name: "CollaCrew AI",
      href: "/client/ai",
      icon: Sparkles,
    },
  ],
  [
    {
      name: "Mesajlar",
      href: "/client/messages",
      icon: MessageCircle,
    },
    {
      name: "Bildirimler",
      href: "/client/notifications",
      icon: Bell,
    },
    {
      name: "Ayarlar",
      href: "/client/settings",
      icon: Settings,
    },
    {
      name: "Yardım / Destek Talebi",
      href: "/client/help",
      icon: CircleHelp,
    },
    {
      name: "Profil",
      href: "/client/profile",
      icon: UserRound,
    },
  ],
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const [collapsed, setCollapsed] = useState(false);
  const [name, setName] = useState("Proje sahibi");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const {
    unreadNotifications,
    unreadMessages,
    pendingProposals,
  } = useSidebarCounts("client");

  function getBadgeCount(href: string): number {
    if (href === "/client/notifications") return unreadNotifications;
    if (href === "/client/messages") return unreadMessages;
    if (href === "/client/proposals") return pendingProposals;
    return 0;
  }

  /*
   * Sidebar açık / kapalı durumunu kaydet.
   */
  useEffect(() => {
    setMounted(true);

    const savedState = window.localStorage.getItem(
      "collacrew-client-sidebar-collapsed"
    );

    if (savedState === "true") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    window.localStorage.setItem(
      "collacrew-client-sidebar-collapsed",
      String(collapsed)
    );
  }, [collapsed, mounted]);

  /*
   * Kullanıcı profilini getir.
   */
  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!data) return;

      const fullName = [data.first_name, data.last_name]
        .filter(Boolean)
        .join(" ");

      if (fullName) {
        setName(fullName);
      }

      if (data.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    }

    void loadProfile();
  }, [supabase]);

  const isActive = (href: string) => {
    if (pathname === href) return true;

    return pathname.startsWith(href + "/");
  };

  return (
    <aside
      className={[
        "flex min-h-screen shrink-0 flex-col",
        "border-r border-neutral-200 bg-white",
        "transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[76px]" : "w-[260px]",
      ].join(" ")}
    >
      {/* Logo + Sidebar Toggle */}
      <div
        className={[
          "flex h-[76px] shrink-0 items-center border-b border-neutral-100",
          collapsed
            ? "justify-center px-3"
            : "justify-between px-5",
        ].join(" ")}
      >
        {!collapsed ? (
          <>
            <Link
              href="/client/dashboard"
              className="flex items-center gap-3"
              aria-label="CollaCrew Panel"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
                C
              </div>

              <span className="text-lg font-semibold tracking-tight text-black">
                CollaCrew
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Menüyü daralt"
              title="Menüyü daralt"
              className="
                flex h-8 w-8 items-center justify-center
                rounded-lg text-neutral-500
                transition hover:bg-neutral-100
                hover:text-neutral-900
              "
            >
              <PanelLeftClose
                size={18}
                strokeWidth={1.8}
              />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Menüyü genişlet"
            title="Menüyü genişlet"
            className="
              flex h-9 w-9 items-center justify-center
              rounded-lg text-neutral-500
              transition hover:bg-neutral-100
              hover:text-neutral-900
            "
          >
            <PanelLeftOpen
              size={18}
              strokeWidth={1.8}
            />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        className={[
          "flex-1 overflow-y-auto",
          collapsed ? "px-3 pt-4" : "px-4 pt-5",
        ].join(" ")}
      >
        <div className="space-y-5">
          {menuGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <div className="space-y-1">
                {group.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const badgeCount = getBadgeCount(item.href);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      className={[
                        "group relative flex items-center rounded-lg",
                        "text-sm transition-colors duration-150",
                        collapsed
                          ? "h-10 justify-center px-0"
                          : "h-10 gap-3 px-3",
                        active
                          ? "bg-neutral-100 font-medium text-neutral-950"
                          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950",
                      ].join(" ")}
                    >
                      <span className="relative shrink-0">
                        <Icon
                          size={18}
                          strokeWidth={1.8}
                        />

                        {collapsed && badgeCount > 0 && (
                          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-neutral-900" />
                        )}
                      </span>

                      {!collapsed && (
                        <span className="flex-1 truncate">
                          {item.name}
                        </span>
                      )}

                      {!collapsed && badgeCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-[11px] font-medium text-white">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}

                      {collapsed && (
                        <span
                          className="
                            pointer-events-none
                            absolute
                            left-[calc(100%+10px)]
                            z-50
                            whitespace-nowrap
                            rounded-md
                            bg-neutral-900
                            px-2.5
                            py-1.5
                            text-xs
                            font-medium
                            text-white
                            opacity-0
                            shadow-lg
                            transition-opacity
                            group-hover:opacity-100
                          "
                        >
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {groupIndex !== menuGroups.length - 1 && (
                <div className="mt-5 border-t border-neutral-100" />
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom Section */}
      <div
        className={[
          "shrink-0 border-t border-neutral-100",
          collapsed ? "px-3 py-4" : "px-4 py-5",
        ].join(" ")}
      >
        {/* Logout */}
        <button
          type="button"
          onClick={() => void handleLogout()}
          title={collapsed ? "Çıkış Yap" : undefined}
          className={[
            "w-full",
            "group relative flex h-10 items-center rounded-lg",
            "text-sm text-neutral-500 transition-colors",
            "hover:bg-neutral-50 hover:text-red-500",
            collapsed
              ? "justify-center px-0"
              : "gap-3 px-3",
          ].join(" ")}
        >
          <LogOut
            size={18}
            strokeWidth={1.8}
            className="shrink-0"
          />

          {!collapsed && (
            <span>Çıkış Yap</span>
          )}

          {collapsed && (
            <span
              className="
                pointer-events-none
                absolute
                left-[calc(100%+10px)]
                z-50
                whitespace-nowrap
                rounded-md
                bg-neutral-900
                px-2.5
                py-1.5
                text-xs
                font-medium
                text-white
                opacity-0
                shadow-lg
                transition-opacity
                group-hover:opacity-100
              "
            >
              Çıkış Yap
            </span>
          )}
        </button>

        {/* User */}
        <Link
          href="/client/profile"
          title={collapsed ? name : undefined}
          className={[
            "mt-3 flex items-center rounded-xl",
            "bg-neutral-50 transition-colors hover:bg-neutral-100",
            collapsed
              ? "h-11 justify-center px-0"
              : "gap-3 px-3 py-2.5",
          ].join(" ")}
        >
          <div className="
            flex h-9 w-9 shrink-0
            items-center justify-center
            overflow-hidden rounded-full
            bg-black text-sm font-semibold text-white
          ">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              name.charAt(0).toLocaleUpperCase("tr-TR")
            )}
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900">
                {name}
              </p>

              <p className="truncate text-xs text-neutral-500">
                Proje sahibi
              </p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
