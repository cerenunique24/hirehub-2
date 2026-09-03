"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UsersRound,
  FileText,
  Mail,
  MessageCircle,
  CreditCard,
  Sparkles,
  Settings,
  Plus,
  LogOut,
} from "lucide-react";

const menuGroups = [
  [
    { name: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
    { name: "Create Project", href: "/client/create-project", icon: Plus },
  ],
  [
    { name: "Projects", href: "/client/projects", icon: FolderKanban },
    { name: "Freelancers", href: "/client/freelancers", icon: Users },
    { name: "Coalitions", href: "/client/coalitions", icon: UsersRound },
    { name: "Proposals", href: "/client/proposals", icon: FileText },
    { name: "Invitations", href: "/client/invitations", icon: Mail },
  ],
  [
    { name: "Messages", href: "/client/messages", icon: MessageCircle },
    { name: "Payments", href: "/client/payments", icon: CreditCard },
    { name: "CollaCrew AI", href: "/client/ai", icon: Sparkles },
  ],
  [
    { name: "Settings", href: "/client/settings", icon: Settings },
  ],
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-[260px] flex-col bg-white px-5 py-6 shadow-[4px_0_15px_rgba(0,0,0,0.04)]">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
          H
        </div>
        <div className="text-xl font-bold text-black">HireHub</div>
      </div>

      <nav className="flex-1 space-y-6">
        {menuGroups.map((group, index) => (
          <div key={index}>
            <div className="space-y-1">
              {group.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition ${
                      active
                        ? "bg-black text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
            {index !== menuGroups.length - 1 && (
              <div className="my-5 border-t border-gray-100" />
            )}
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-gray-100 pt-6">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-red-400 transition hover:bg-gray-50"
        >
          <LogOut size={18} strokeWidth={1.8} />
          <span>Sign out</span>
        </Link>

        <div className="mt-6 flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
            C
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-900">
              Client Account
            </p>
            <p className="truncate text-xs text-neutral-500">Individual</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
