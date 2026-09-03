"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  MessageSquare,
  Search,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const [name, setName] = useState("Freelancer");

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();

      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) return;

      const userName =
        user.user_metadata?.first_name ||
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        "Freelancer";

      setName(userName);
    };

    fetchUser();
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-200 bg-white px-8">
      
      {/* Sol */}
      <div>
        <h1 className="text-2xl font-bold text-primary">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Freelancer çalışma alanına hoş geldin.
        </p>
      </div>

      {/* Sağ */}
      <div className="flex items-center gap-4">

        {/* Arama */}
        <div className="hidden lg:flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2">
          <Search
            size={18}
            className="text-gray-400"
          />

          <input
            type="text"
            placeholder="Ara..."
            className="w-52 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>

        {/* Bildirim */}
        <button
          type="button"
          className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 transition hover:bg-gray-100"
        >
          <Bell size={20} />

          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* Mesaj */}
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 transition hover:bg-gray-100"
        >
          <MessageSquare size={20} />
        </button>

        {/* Profil */}
        <button
          type="button"
          className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 transition hover:bg-gray-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
            {name.charAt(0).toUpperCase()}
          </div>

          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">
              {name}
            </p>

            <p className="text-xs text-gray-500">
              Freelancer
            </p>
          </div>

          <ChevronDown
            size={18}
            className="text-gray-500"
          />
        </button>

      </div>
    </header>
  );
}