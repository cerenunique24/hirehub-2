"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSidebarCounts } from "@/lib/hooks/useSidebarCounts";

import {
  LayoutDashboard,
  Compass,
  FileText,
  BriefcaseBusiness,
  UsersRound,
  MessageCircle,
  Bell,
  Wallet,
  Sparkles,
  UserCircle,
  Settings,
  CircleHelp,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const menuGroups = [
  [
    {
      name: "Panel",
      href: "/freelancers/dashboard",
      icon: LayoutDashboard,
    },
  ],
  [
    {
      name: "Projeleri Keşfet",
      href: "/freelancers/discover",
      icon: Compass,
    },
    {
      name: "Projelerim",
      href: "/freelancers/projects",
      icon: BriefcaseBusiness,
    },
    {
      name: "Tekliflerim",
      href: "/freelancers/proposals",
      icon: FileText,
    },
    {
      name: "Koalisyonlar",
      href: "/freelancers/coalitions",
      icon: UsersRound,
    },
    {
      name: "Freelancerlar",
      href: "/freelancers/freelancers",
      icon: UsersRound,
    },
    {
      name: "Kazançlar",
      href: "/freelancers/earnings",
      icon: Wallet,
    },
    {
      name: "CollaCrew AI",
      href: "/freelancers/ai",
      icon: Sparkles,
    },
  ],
  [
    {
      name: "Mesajlar",
      href: "/freelancers/messages",
      icon: MessageCircle,
    },
    {
      name: "Bildirimler",
      href: "/freelancers/notifications",
      icon: Bell,
    },
    {
      name: "Ayarlar",
      href: "/freelancers/settings",
      icon: Settings,
    },
    {
      name: "Yardım / Destek Talebi",
      href: "/freelancers/help",
      icon: CircleHelp,
    },
    {
      name: "Profil",
      href: "/freelancers/profile",
      icon: UserCircle,
    },
  ],
];

type MenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
};

type UserProfile = {
  avatar_url?: string | null;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("Freelancer");
  const [avatar, setAvatar] = useState<string | null>(null);

  const {
    unreadNotifications,
    unreadMessages,
    pendingProposals,
  } = useSidebarCounts("freelancer");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function getBadgeCount(href: string): number {
    if (href === "/freelancers/notifications") return unreadNotifications;
    if (href === "/freelancers/messages") return unreadMessages;
    if (href === "/freelancers/proposals") return pendingProposals;
    return 0;
  }

  // Sidebar durumunu kaydet.
  useEffect(() => {
    setMounted(true);

    const savedState = window.localStorage.getItem(
      "collacrew-freelancer-sidebar-collapsed"
    );

    if (savedState === "true") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    window.localStorage.setItem(
      "collacrew-freelancer-sidebar-collapsed",
      String(collapsed)
    );
  }, [collapsed, mounted]);

  // Kullanıcı profilini getir.
  useEffect(() => {
    let isMounted = true;

    const getUserProfile = async () => {
      const supabase = createClient();

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        // Oturum yoksa bunu hata olarak göstermiyoruz.
        if (
          userError?.name === "AuthSessionMissingError" ||
          userError?.message === "Auth session missing!"
        ) {
          router.replace("/login");
          return;
        }

        if (userError) {
          console.error("USER FETCH ERROR:", userError);
          return;
        }

        // Supabase hata vermeden de user null dönebilir.
        if (!user) {
          router.replace("/login");
          return;
        }

        if (!isMounted) return;

        const name =
          user.user_metadata?.first_name ||
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          "Freelancer";

        setUserName(name);

        const { data, error } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("SIDEBAR PROFILE ERROR:", error);
          return;
        }

        if (!isMounted) return;

        const profile = data as UserProfile | null;

        if (profile?.avatar_url) {
          setAvatar(profile.avatar_url);
        }
      } catch (error) {
        // Oturum eksikliği normal bir durum olduğu için
        // AuthSessionMissingError'ı tekrar console'a yazdırmıyoruz.
        if (
          error instanceof Error &&
          (error.name === "AuthSessionMissingError" ||
            error.message === "Auth session missing!")
        ) {
          router.replace("/login");
          return;
        }

        console.error("SIDEBAR ERROR:", error);
      }
    };

    void getUserProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const isActive = (href: string) => {
    if (pathname === href) return true;

    return pathname.startsWith(href + "/");
  };

  const renderItem = (item: MenuItem) => {
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
              href="/freelancers/dashboard"
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
                {group.map(renderItem)}
              </div>

              {groupIndex !== menuGroups.length - 1 && (
                <div className="mt-5 border-t border-neutral-100" />
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom */}
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

          {!collapsed && <span>Çıkış Yap</span>}

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
          href="/freelancers/profile"
          title={collapsed ? userName : undefined}
          className={[
            "mt-3 flex items-center rounded-xl",
            "bg-neutral-50 transition-colors hover:bg-neutral-100",
            collapsed
              ? "h-11 justify-center px-0"
              : "gap-3 px-3 py-2.5",
          ].join(" ")}
        >
          {avatar ? (
            <img
              src={avatar}
              alt={userName}
              className="
                h-9 w-9 shrink-0 rounded-full
                border border-neutral-200 object-cover
              "
            />
          ) : (
            <div
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-full bg-black
                text-sm font-semibold text-white
              "
            >
              {userName.charAt(0).toLocaleUpperCase("tr-TR")}
            </div>
          )}

          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900">
                {userName}
              </p>

              <p className="truncate text-xs text-neutral-500">
                Freelancer
              </p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}