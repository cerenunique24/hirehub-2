"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import HelpAndSupport from "@/components/support/HelpAndSupport";

export default function ClientHelpPage() {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from("projects").select("id, title").eq("client_id", user.id);
      setProjects(data ?? []);
    }
    void load();
  }, [supabase]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Yardım</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Sık sorulan sorulara göz at ya da bir destek talebi oluştur.
        </p>
      </div>
      <HelpAndSupport audience="client" ticketBasePath="/client/help/tickets" projectOptions={projects} />
    </div>
  );
}
