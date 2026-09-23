"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useSidebarCounts } from "@/lib/hooks/useSidebarCounts";
import { Avatar } from "@/components/ui/Avatar";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type SidebarMenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

export type SidebarProfile = {
  name?: string | null;
  avatarUrl?: string | null;
};

/**
 * CollaCrew Design System — Sidebar.
 *
 * Shared primary navigation for both the Client and Freelancer panels.
 * Role-specific menu structure, storage key and profile resolution are
 * passed in as props; layout, collapse behaviour and interaction states
 * are identical across panels.
 */
export function Sidebar({
  menuGroups,
  dashboardHref,
  profileHref,
  roleLabel,
  storageKey,
  countsRole,
  resolveProfile,
  fallbackName,
}: {
  menuGroups: SidebarMenuItem[][];
  dashboardHref: string;
  profileHref: string;
  roleLabel: string;
  storageKey: string;
  countsRole: "client" | "freelancer";
  resolveProfile: (supabase: SupabaseClient, user: User) => Promise<SidebarProfile | null>;
  fallbackName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState(fallbackName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { unreadNotifications, unreadMessages, pendingProposals } = useSidebarCounts(countsRole);

  function getBadgeCount(href: string): number {
    if (href.endsWith("/notifications")) return unreadNotifications;
    if (href.endsWith("/messages")) return unreadMessages;
    if (href.endsWith("/proposals")) return pendingProposals;
    return 0;
  }

  useEffect(() => {
    setMounted(true);
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "true") setCollapsed(true);
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(storageKey, String(collapsed));
  }, [collapsed, mounted, storageKey]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        const missingSession =
          error?.name === "AuthSessionMissingError" || error?.message === "Auth session missing!";

        if (missingSession || !user) {
          router.replace("/login");
          return;
        }

        if (error) {
          console.error("SIDEBAR USER ERROR:", error);
          return;
        }

        const profile = await resolveProfile(supabase, user);
        if (!isMounted || !profile) return;

        if (profile.name) setName(profile.name);
        if (profile.avatarUrl) setAvatarUrl(profile.avatarUrl);
      } catch (err) {
        console.error("SIDEBAR ERROR:", err);
      }
    }

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, [supabase, router, resolveProfile]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={[
        "flex min-h-screen shrink-0 flex-col",
        "border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]",
        "transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[76px]" : "w-[260px]",
      ].join(" ")}
    >
      {/* Logo + toggle */}
      <div
        className={[
          "flex h-[76px] shrink-0 items-center border-b border-[var(--color-border-subtle)]",
          collapsed ? "justify-center px-3" : "justify-between px-5",
        ].join(" ")}
      >
        {!collapsed ? (
          <>
            <Link href={dashboardHref} className="flex items-center" aria-label="CollaCrew Panel">
              <Image src="/logo.png" alt="CollaCrew" width={147} height={28} priority />
            </Link>

            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Menüyü daralt"
              title="Menüyü daralt"
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-button)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-canvas)] hover:text-[var(--color-text-primary)]"
            >
              <PanelLeftClose size={16} strokeWidth={1.8} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Menüyü genişlet"
            title="Menüyü genişlet"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-button)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-canvas)] hover:text-[var(--color-text-primary)]"
          >
            <PanelLeftOpen size={16} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={["flex-1 overflow-y-auto", collapsed ? "px-3 pt-4" : "px-4 pt-5"].join(" ")}>
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
                        "group relative flex items-center rounded-[var(--radius-nav)] text-sm font-medium transition-colors duration-150",
                        collapsed ? "h-9 justify-center px-0" : "h-9 gap-2.5 px-2.5",
                        active
                          ? "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-text-primary)]",
                      ].join(" ")}
                    >
                      <span className="relative shrink-0">
                        <Icon size={18} strokeWidth={1.8} />
                        {collapsed && badgeCount > 0 && (
                          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--color-primary-600)]" />
                        )}
                      </span>

                      {!collapsed && <span className="flex-1 truncate">{item.name}</span>}

                      {!collapsed && badgeCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-600)] px-1.5 text-[11px] font-medium text-white">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}

                      {collapsed && (
                        <span className="pointer-events-none absolute left-[calc(100%+10px)] z-50 whitespace-nowrap rounded-md bg-[var(--color-text-primary)] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {groupIndex !== menuGroups.length - 1 && (
                <div className="mt-5 border-t border-[var(--color-border-subtle)]" />
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom section */}
      <div
        className={[
          "shrink-0 border-t border-[var(--color-border-subtle)]",
          collapsed ? "px-3 py-4" : "px-4 py-5",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => void handleLogout()}
          title={collapsed ? "Çıkış Yap" : undefined}
          className={[
            "w-full group relative flex h-9 items-center rounded-[var(--radius-nav)] text-sm font-medium transition-colors",
            "text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-error-600)]",
            collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
          ].join(" ")}
        >
          <LogOut size={18} strokeWidth={1.8} className="shrink-0" />
          {!collapsed && <span>Çıkış Yap</span>}
          {collapsed && (
            <span className="pointer-events-none absolute left-[calc(100%+10px)] z-50 whitespace-nowrap rounded-md bg-[var(--color-text-primary)] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              Çıkış Yap
            </span>
          )}
        </button>

        <Link
          href={profileHref}
          title={collapsed ? name : undefined}
          className={[
            "mt-3 flex items-center rounded-xl bg-[var(--color-canvas)] transition-colors hover:bg-[var(--color-surface-2)]",
            collapsed ? "h-11 justify-center px-0" : "gap-3 px-3 py-2.5",
          ].join(" ")}
        >
          <Avatar src={avatarUrl} name={name} size="md" />

          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{name}</p>
              <p className="truncate text-xs text-[var(--color-text-secondary)]">{roleLabel}</p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
