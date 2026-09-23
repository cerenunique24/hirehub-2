"use client";

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
  CircleHelp,
  UserRound,
  MessageCircle,
  Bell,
} from "lucide-react";

import { Sidebar, type SidebarMenuItem } from "@/components/layout/Sidebar";

const menuGroups: SidebarMenuItem[][] = [
  [
    { name: "Panel", href: "/client/dashboard", icon: LayoutDashboard },
    { name: "Proje Oluştur", href: "/client/projects/new", icon: Plus },
  ],
  [
    { name: "Freelancerlar", href: "/client/freelancers", icon: Users },
    { name: "Projelerim", href: "/client/projects", icon: FolderKanban },
    { name: "Tekliflerim", href: "/client/proposals", icon: FileText },
    { name: "Koalisyonlar", href: "/client/coalitions", icon: UsersRound },
    { name: "Ödemeler", href: "/client/payments", icon: CreditCard },
    { name: "CollaCrew AI", href: "/client/ai", icon: Sparkles },
  ],
  [
    { name: "Mesajlar", href: "/client/messages", icon: MessageCircle },
    { name: "Bildirimler", href: "/client/notifications", icon: Bell },
    { name: "Ayarlar", href: "/client/settings", icon: Settings },
    { name: "Yardım / Destek Talebi", href: "/client/help", icon: CircleHelp },
    { name: "Profil", href: "/client/profile", icon: UserRound },
  ],
];

export default function ClientSidebar() {
  return (
    <Sidebar
      menuGroups={menuGroups}
      dashboardHref="/client/dashboard"
      profileHref="/client/profile"
      roleLabel="Proje sahibi"
      storageKey="collacrew-client-sidebar-collapsed"
      countsRole="client"
      fallbackName="Proje sahibi"
      resolveProfile={async (supabase, user) => {
        const { data } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (!data) return null;

        const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ");

        return { name: fullName || undefined, avatarUrl: data.avatar_url };
      }}
    />
  );
}
