"use client";

import { pageHeaderClass } from "@/components/ui/PageHeader";
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
    <div className="w-full">
      <div className={pageHeaderClass}>
        <h1 className="cc-page-title font-semibold text-[var(--color-text-primary)]">Yardım</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Sık sorulan sorulara göz at ya da bir destek talebi oluştur.
        </p>
      </div>
      <HelpAndSupport audience="client" ticketBasePath="/client/help/tickets" projectOptions={projects} />
    </div>
  );
}
