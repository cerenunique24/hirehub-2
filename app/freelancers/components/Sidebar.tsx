"use client";

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
} from "lucide-react";

import { Sidebar, type SidebarMenuItem } from "@/components/layout/Sidebar";

const menuGroups: SidebarMenuItem[][] = [
  [{ name: "Panel", href: "/freelancers/dashboard", icon: LayoutDashboard }],
  [
    { name: "Projeleri Keşfet", href: "/freelancers/discover", icon: Compass },
    { name: "Projelerim", href: "/freelancers/projects", icon: BriefcaseBusiness },
    { name: "Tekliflerim", href: "/freelancers/proposals", icon: FileText },
    { name: "Koalisyonlar", href: "/freelancers/coalitions", icon: UsersRound },
    { name: "Freelancerlar", href: "/freelancers/freelancers", icon: UsersRound },
    { name: "Kazançlar", href: "/freelancers/earnings", icon: Wallet },
    { name: "CollaCrew AI", href: "/freelancers/ai", icon: Sparkles },
  ],
  [
    { name: "Mesajlar", href: "/freelancers/messages", icon: MessageCircle },
    { name: "Bildirimler", href: "/freelancers/notifications", icon: Bell },
    { name: "Ayarlar", href: "/freelancers/settings", icon: Settings },
    { name: "Yardım / Destek Talebi", href: "/freelancers/help", icon: CircleHelp },
    { name: "Profil", href: "/freelancers/profile", icon: UserCircle },
  ],
];

export default function FreelancerSidebar() {
  return (
    <Sidebar
      menuGroups={menuGroups}
      dashboardHref="/freelancers/dashboard"
      profileHref="/freelancers/profile"
      roleLabel="Freelancer"
      storageKey="collacrew-freelancer-sidebar-collapsed"
      countsRole="freelancer"
      fallbackName="Freelancer"
      resolveProfile={async (supabase, user) => {
        const name =
          user.user_metadata?.first_name ||
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          undefined;

        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();

        return { name, avatarUrl: (data as { avatar_url?: string | null } | null)?.avatar_url };
      }}
    />
  );
}
