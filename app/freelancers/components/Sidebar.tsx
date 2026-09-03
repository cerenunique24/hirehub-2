"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

import {
  LayoutDashboard,
  Compass,
  FileText,
  BriefcaseBusiness,
  UsersRound,
  MessageCircle,
  Bell,
  Wallet,
  UserCircle,
  Settings,
  CircleHelp,
  LogOut,
} from "lucide-react";

const menuGroups = [
  [
    {
      name: "Dashboard",
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
      name: "Projelerim",
      href: "/freelancers/projects",
      icon: BriefcaseBusiness,
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
  ],
  [
    {
      name: "Kazançlar",
      href: "/freelancers/earnings",
      icon: Wallet,
    },
  ],
  [
    {
      name: "Profilim",
      href: "/freelancers/profile",
      icon: UserCircle,
    },
    {
      name: "Ayarlar",
      href: "/freelancers/settings",
      icon: Settings,
    },
  ],
];

const bottomMenu = [
  {
    name: "Yardım",
    href: "/freelancers/help",
    icon: CircleHelp,
  },
];

type MenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
};

type UserProfile = {
  avatar_url?: string | null;
};

export default function Sidebar() {
  const pathname = usePathname();

  const [userName, setUserName] = useState("Freelancer");
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const getUserProfile = async () => {
      const supabase = createClient();

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("USER FETCH ERROR:", userError);
          return;
        }

        if (!user) {
          return;
        }

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

        const profile = data as UserProfile | null;

        if (profile?.avatar_url) {
          setAvatar(profile.avatar_url);
        }
      } catch (error) {
        console.error("SIDEBAR ERROR:", error);
      }
    };

    getUserProfile();
  }, []);

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;

    const active =
      pathname === item.href ||
      pathname.startsWith(item.href + "/");

    return (
      <Link
        key={item.name}
        href={item.href}
        className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition ${
          active
            ? "bg-black text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <Icon size={18} strokeWidth={1.8} />

        <span className="flex-1">
          {item.name}
        </span>
      </Link>
    );
  };

  return (
    <aside className="w-[260px] min-h-screen bg-white shadow-[4px_0_15px_rgba(0,0,0,0.04)] px-5 py-6 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
          H
        </div>

        <div className="text-xl font-bold text-black">
          HireHub
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        {menuGroups.map((group, index) => (
          <div key={index}>
            <div className="space-y-1">
              {group.map(renderItem)}
            </div>

            {index !== menuGroups.length - 1 && (
              <div className="my-5 border-t border-gray-100" />
            )}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="mt-auto pt-6">
        <div className="mb-5 border-t border-gray-100" />

        {bottomMenu.map(renderItem)}

        {/* Logout */}
        <Link
          href="/"
          className="w-full mt-1 flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 rounded-lg hover:bg-red-50 transition"
        >
          <LogOut size={18} strokeWidth={1.8} />

          <span>Çıkış Yap</span>
        </Link>

        {/* User */}
        <div className="mt-6 flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-3">
          {avatar ? (
            <img
              src={avatar}
              alt={userName}
              className="h-10 w-10 shrink-0 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">
              {userName}
            </p>

            <p className="truncate text-xs text-gray-500">
              Freelancer
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}