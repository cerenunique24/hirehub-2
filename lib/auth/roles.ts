export type SessionRole = "freelancer" | "client";

export function normalizeSessionRole(value: unknown): SessionRole | null {
  return value === "freelancer" || value === "client" ? value : null;
}

export function panelHome(role: SessionRole): string {
  return role === "client" ? "/client/dashboard" : "/freelancers/dashboard";
}

const FREELANCER_PROTECTED_SEGMENTS = new Set([
  "ai", "coalitions", "dashboard", "discover", "earnings", "freelancers",
  "help", "invitations", "messages", "notifications", "performance",
  "profile", "projects", "proposals", "saved", "settings",
]);

export function isProtectedPanelPath(pathname: string): boolean {
  if (pathname === "/client" || pathname.startsWith("/client/")) return true;
  if (!pathname.startsWith("/freelancers/")) return false;
  return FREELANCER_PROTECTED_SEGMENTS.has(pathname.split("/")[2] ?? "");
}

export function resolvePanelAccess(
  pathname: string,
  session: { authenticated: boolean; emailConfirmed: boolean; role: SessionRole | null }
): string | null {
  if (!isProtectedPanelPath(pathname)) return null;
  if (!session.authenticated) return "/login";
  if (!session.emailConfirmed) return "/auth/verify-email";

  if (pathname === "/client" || pathname.startsWith("/client/")) {
    return session.role === "freelancer" ? panelHome("freelancer") : null;
  }

  return session.role === "client" ? panelHome("client") : null;
}
