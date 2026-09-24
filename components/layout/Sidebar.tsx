"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, LogOut, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useSidebarCounts } from "@/lib/hooks/useSidebarCounts";
import { Avatar } from "@/components/ui/Avatar";
import { useMobileSidebar } from "@/components/layout/MobileSidebarContext";
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
 *
 * Responsive: at `lg` (1024px) and above this renders exactly as before —
 * a static column that can be collapsed to icon-only. Below `lg` it becomes
 * a fixed slide-in drawer (opened via the hamburger button in the panel's
 * navbar, through `useMobileSidebar()`) that always shows the full
 * (non-collapsed) layout — the collapse toggle is a desktop-only
 * convenience and doesn't apply to a drawer.
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
  const { open: mobileOpen, setOpen: setMobileOpen } = useMobileSidebar();

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [name, setName] = useState(fallbackName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // The collapse-to-icons affordance only makes sense for the static desktop
  // column — a mobile drawer always renders fully expanded regardless of
  // the persisted `collapsed` preference.
  const collapsedUI = collapsed && isDesktop;

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

  // Tracks the `lg` breakpoint so `collapsedUI` never applies on mobile,
  // and reacts live to resizing (e.g. rotating a tablet).
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(query.matches);

    function handleChange(event: MediaQueryListEvent) {
      setIsDesktop(event.matches);
    }

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  // Closes the mobile drawer whenever the route changes (link clicked).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // Locks page scroll while the mobile drawer is open — only reachable via
  // the hamburger button, which itself only renders below `lg`.
  useEffect(() => {
    if (!mobileOpen) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

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
    <>
      {/* Mobile overlay — click to close, hidden entirely at lg+ */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] flex-col",
          "border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]",
          "transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:h-screen lg:min-h-screen lg:translate-x-0 lg:transition-[width]",
          collapsedUI ? "lg:w-[76px]" : "lg:w-[260px]",
        ].join(" ")}
      >
        {/* Logo + toggle */}
        <div
          className={[
            "flex h-[76px] shrink-0 items-center border-b border-[var(--color-border-subtle)]",
            collapsedUI ? "lg:justify-center lg:px-3" : "lg:justify-between lg:px-5",
            "justify-between px-5",
          ].join(" ")}
        >
          {/* Mobile: always the full logo + close button, regardless of the desktop collapse state */}
          <div className="flex w-full items-center justify-between lg:hidden">
            <Link href={dashboardHref} className="flex items-center" aria-label="CollaCrew Panel">
              <Image src="/logo.png" alt="CollaCrew" width={147} height={28} priority />
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Menüyü kapat"
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-button)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-canvas)] hover:text-[var(--color-text-primary)]"
            >
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>

          {/* Desktop: original collapse/expand behaviour, unchanged */}
          <div className="hidden w-full items-center lg:flex lg:justify-between">
            {!collapsedUI ? (
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
                className="mx-auto flex h-8 w-8 items-center justify-center rounded-[var(--radius-button)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-canvas)] hover:text-[var(--color-text-primary)]"
              >
                <PanelLeftOpen size={16} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={["flex-1 overflow-y-auto px-4 pt-5", collapsedUI ? "lg:px-3 lg:pt-4" : ""].join(" ")}>
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
                        title={collapsedUI ? item.name : undefined}
                        className={[
                          "group relative flex h-9 items-center gap-2.5 rounded-[var(--radius-nav)] px-2.5 text-sm font-medium transition-colors duration-150",
                          collapsedUI ? "lg:justify-center lg:gap-0 lg:px-0" : "",
                          active
                            ? "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-text-primary)]",
                        ].join(" ")}
                      >
                        <span className="relative shrink-0">
                          <Icon size={18} strokeWidth={1.8} />
                          {collapsedUI && badgeCount > 0 && (
                            <span className="absolute -right-1 -top-1 hidden h-2 w-2 rounded-full bg-[var(--color-primary-600)] lg:block" />
                          )}
                        </span>

                        <span className={["flex-1 truncate", collapsedUI ? "lg:hidden" : ""].join(" ")}>
                          {item.name}
                        </span>

                        {badgeCount > 0 && (
                          <span
                            className={[
                              "ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-600)] px-1.5 text-[11px] font-medium text-white",
                              collapsedUI ? "lg:hidden" : "",
                            ].join(" ")}
                          >
                            {badgeCount > 99 ? "99+" : badgeCount}
                          </span>
                        )}

                        {collapsedUI && (
                          <span className="pointer-events-none absolute left-[calc(100%+10px)] z-50 hidden whitespace-nowrap rounded-md bg-[var(--color-text-primary)] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 lg:block">
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
            "shrink-0 border-t border-[var(--color-border-subtle)] px-4 py-5",
            collapsedUI ? "lg:px-3 lg:py-4" : "",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => void handleLogout()}
            title={collapsedUI ? "Çıkış Yap" : undefined}
            className={[
              "group relative flex h-9 w-full items-center gap-2.5 rounded-[var(--radius-nav)] px-2.5 text-sm font-medium transition-colors",
              "text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-error-600)]",
              collapsedUI ? "lg:justify-center lg:gap-0 lg:px-0" : "",
            ].join(" ")}
          >
            <LogOut size={18} strokeWidth={1.8} className="shrink-0" />
            <span className={collapsedUI ? "lg:hidden" : ""}>Çıkış Yap</span>
            {collapsedUI && (
              <span className="pointer-events-none absolute left-[calc(100%+10px)] z-50 hidden whitespace-nowrap rounded-md bg-[var(--color-text-primary)] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 lg:block">
                Çıkış Yap
              </span>
            )}
          </button>

          <Link
            href={profileHref}
            title={collapsedUI ? name : undefined}
            className={[
              "mt-3 flex items-center gap-3 rounded-xl bg-[var(--color-canvas)] px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-2)]",
              collapsedUI ? "lg:h-11 lg:justify-center lg:gap-0 lg:px-0 lg:py-0" : "",
            ].join(" ")}
          >
            <Avatar src={avatarUrl} name={name} size="md" />

            <div className={["min-w-0", collapsedUI ? "lg:hidden" : ""].join(" ")}>
              <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{name}</p>
              <p className="truncate text-xs text-[var(--color-text-secondary)]">{roleLabel}</p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
