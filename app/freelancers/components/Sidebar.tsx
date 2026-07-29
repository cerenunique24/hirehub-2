"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      badge: true,
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



export default function Sidebar() {

  const pathname = usePathname();



  const renderItem = (item: {
    name: string;
    href: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    badge?: boolean;
  }) => {

    const Icon = item.icon;


    const active =
      pathname === item.href ||
      pathname.startsWith(item.href + "/");



    return (

      <Link
        key={item.name}
        href={item.href}
        className={`
          flex
          items-center
          gap-3
          px-4
          py-2.5
          text-sm
          rounded-lg
          transition

          ${
            active
            ? "bg-black text-white"
            : "text-gray-600 hover:bg-gray-100"
           }
        `}
      >

        <Icon
          size={18}
          strokeWidth={1.8}
        />


        <span className="flex-1">
          {item.name}
        </span>

        {item.badge && (
          <span className="h-2 w-2 rounded-full bg-red-500" />
        )}


      </Link>

    );

  };




  return (

<aside

className="
  w-[260px]
  min-h-screen
  bg-white
  shadow-[4px_0_15px_rgba(0,0,0,0.04)]
  px-5
  py-6
  flex
  flex-col
"

>



{/* Logo */}

<div className="flex items-center gap-3 px-2 mb-8">

  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
    H
  </div>

  <div className="text-xl font-bold text-black">
    HireHub
  </div>

</div>







      {/* Ana Menü */}

      <nav className="flex-1">


        {menuGroups.map((group,index)=>{


          return (

          <div key={index}>


            <div className="space-y-1">

              {group.map(renderItem)}

            </div>





            {index !== menuGroups.length - 1 && (

              <div
                className="
                  my-5
                  border-t
                  border-gray-100
                "
              />

            )}



          </div>

          );


        })}



      </nav>









      {/* Alt Menü & Profil */}

      <div className="mt-auto pt-6">


        <div
          className="
            mb-5
            border-t
            border-gray-100
          "
        />



        {bottomMenu.map(renderItem)}



        <Link

          href="/"

          className="
            w-full
            mt-1
            flex
            items-center
            gap-3
            px-4
            py-2.5
            text-sm
            text-red-400
            rounded-lg
            hover:bg-white/10
            transition
          "

        >

          <LogOut
            size={18}
            strokeWidth={1.8}
          />

          <span>
            Çıkış Yap
          </span>

        </Link>



        <div className="mt-6 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-active text-sm font-semibold text-white">
            M
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              Mert Karahan
            </p>
            <p className="truncate text-xs text-white/50">
              Freelancer
            </p>
          </div>

        </div>



      </div>



    </aside>

  );

}
