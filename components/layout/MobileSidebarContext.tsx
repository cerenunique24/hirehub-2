"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Shared open/close state for the mobile navigation drawer.
 *
 * `Sidebar` (the drawer itself) and each panel's top navbar (the hamburger
 * button that opens it) are separate client components rendered side by
 * side from a server layout, so they need a small shared source of truth
 * rather than prop drilling through the server layout. Used by both the
 * client and freelancer panels (`app/client/layout.tsx`,
 * `app/freelancers/layout.tsx`) — desktop behaviour is unaffected, this
 * state only matters below the `lg` breakpoint.
 */
const MobileSidebarContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MobileSidebarContext.Provider value={{ open, setOpen }}>{children}</MobileSidebarContext.Provider>;
}

export function useMobileSidebar() {
  const ctx = useContext(MobileSidebarContext);
  if (!ctx) throw new Error("useMobileSidebar must be used within a MobileSidebarProvider");
  return ctx;
}
