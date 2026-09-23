"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import HelpAndSupport from "@/components/support/HelpAndSupport";

export default function FreelancerHelpPage() {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("project_team_members")
        .select("project_id")
        .eq("freelancer_id", user.id)
        .eq("status", "active");

      const projectIds = [...new Set((memberships ?? []).map((m) => m.project_id))];
      if (projectIds.length === 0) return;

      const { data } = await supabase.from("projects").select("id, title").in("id", projectIds);
      setProjects(data ?? []);
    }
    void load();
  }, [supabase]);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Yardım</h1>
        <p className="mt-2 text-sm text-gray-500">Sık sorulan sorulara göz at ya da bir destek talebi oluştur.</p>
      </div>
      <HelpAndSupport audience="freelancer" ticketBasePath="/freelancers/help/tickets" projectOptions={projects} />
    </div>
  );
}
