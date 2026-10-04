"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { notifyFreelancerInvited } from "@/lib/notifications";
import { friendlyRpcError } from "@/lib/utils/rpcError";
import { CONTACT_INFO_MESSAGE, containsContactInfo } from "@/lib/moderation/contactInfoFilter";
import { fetchBudgetBreakdown, getRoleCapacity, normalizeRoleName } from "@/lib/projects/teamReadiness";

type InvitableProject = {
  id: string;
  title: string;
  status: string;
  budget_breakdown: Array<{ role?: string; name?: string; budgetPerPerson?: number; duration?: string }> | null;
  activeMemberRoles: string[];
};

const SINGLE_FREELANCER_ROLE = "Tek Freelancer";

function rolesOf(project: InvitableProject | undefined) {
  const breakdown = Array.isArray(project?.budget_breakdown) ? project.budget_breakdown : [];
  const roles = breakdown
    .map((item) => ({
      name: (item.role ?? item.name ?? "").trim(),
      budgetPerPerson: Number(item.budgetPerPerson ?? 0),
      duration: item.duration ?? "",
    }))
    .filter((item) => item.name);

  const base = roles.length > 0 ? roles : [{ name: SINGLE_FREELANCER_ROLE, budgetPerPerson: 0, duration: "" }];

  return base.map((role) => {
    const capacity = getRoleCapacity(
      roles.length > 0 ? project?.budget_breakdown ?? [] : null,
      role.name
    );
    const filled = (project?.activeMemberRoles ?? []).filter(
      (r) => normalizeRoleName(r) === normalizeRoleName(role.name)
    ).length;

    return { ...role, capacity, filled, isFull: filled >= capacity };
  });
}

/**
 * Client'ın belirli bir freelancer'ı kendi açık projesine davet etmesi.
 * Akış: davet → bildirim → freelancer kabul/red (accept_project_placement RPC'si
 * kapasiteyi ve rolü sunucuda doğrular). Davet şartları (rol, bütçe, süre)
 * kabul anında ekip kaydına dondurulur.
 */
export default function InviteFreelancerPanel({ freelancerId }: { freelancerId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<InvitableProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [role, setRole] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("projects")
        .select("id, title, status")
        .eq("client_id", auth.user.id)
        .in("status", ["open", "ready_to_start"])
        .order("created_at", { ascending: false });

      // budget_breakdown artık doğrudan sütun olarak okunamaz (bkz.
      // supabase/migrations/202609300006_budget_breakdown_privacy.sql).
      // Rol kontenjanının dolu olup olmadığını göstermek için aktif ekip
      // üyeleri de (role bazında) birlikte çekiliyor.
      const withBudgets = await Promise.all(
        ((data ?? []) as Omit<InvitableProject, "budget_breakdown" | "activeMemberRoles">[]).map(
          async (project) => {
            const [budgetBreakdown, activeMembers] = await Promise.all([
              fetchBudgetBreakdown(supabase, project.id),
              supabase
                .from("project_team_members")
                .select("role")
                .eq("project_id", project.id)
                .eq("status", "active"),
            ]);

            return {
              ...project,
              budget_breakdown: budgetBreakdown,
              activeMemberRoles: (activeMembers.data ?? []).map((m) => m.role ?? ""),
            };
          }
        )
      );

      if (!active) return;
      setProjects(withBudgets as InvitableProject[]);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [supabase]);

  const selectedProject = projects.find((p) => p.id === projectId);
  const roleOptions = rolesOf(selectedProject);

  function chooseProject(nextId: string) {
    setProjectId(nextId);
    const options = rolesOf(projects.find((p) => p.id === nextId));
    const first = options.find((r) => !r.isFull) ?? options[0];
    setRole(first?.name ?? "");
    setBudget(first?.budgetPerPerson ? String(first.budgetPerPerson) : "");
    setDuration(first?.duration ?? "");
  }

  function chooseRole(nextRole: string) {
    setRole(nextRole);
    const match = roleOptions.find((r) => r.name === nextRole);
    if (match?.budgetPerPerson) setBudget(String(match.budgetPerPerson));
    if (match?.duration) setDuration(match.duration);
  }

  async function sendInvitation() {
    if (!selectedProject || !role) return;

    const chosenRole = roleOptions.find((r) => r.name === role);
    if (chosenRole?.isFull) {
      setFeedback({ tone: "error", text: `"${role}" rolü için kontenjan dolu.` });
      return;
    }

    const numericBudget = Number(budget);
    if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
      setFeedback({ tone: "error", text: "Geçerli bir bütçe tutarı gir." });
      return;
    }

    if (message.trim() && containsContactInfo(message)) {
      setFeedback({ tone: "error", text: CONTACT_INFO_MESSAGE });
      return;
    }

    setBusy(true);
    setFeedback(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(false);
      setFeedback({ tone: "error", text: "Davet göndermek için giriş yapmalısın." });
      return;
    }

    const { data: invitation, error } = await supabase
      .from("project_team_invitations")
      .insert({
        project_id: selectedProject.id,
        client_id: auth.user.id,
        freelancer_id: freelancerId,
        role,
        budget_per_person: numericBudget,
        duration: duration.trim() || null,
        message: message.trim() || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !invitation) {
      setBusy(false);
      setFeedback({
        tone: "error",
        text:
          error?.code === "23505"
            ? "Bu freelancer'a bu rol için zaten bekleyen bir davet gönderdin."
            : friendlyRpcError(error, "Davet gönderilemedi. Lütfen tekrar dene."),
      });
      return;
    }

    await notifyFreelancerInvited(supabase, {
      freelancerId,
      invitationId: invitation.id,
      projectTitle: selectedProject.title,
    });

    setBusy(false);
    setOpen(false);
    setMessage("");
    setFeedback({ tone: "success", text: "Davet gönderildi. Freelancer yanıtladığında bildirim alacaksın." });
  }

  if (loading) return null;

  return (
    <div className="mb-6">
      {projects.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Davet gönderebilmek için yayında veya ekibi hazırlanan bir projen olmalı.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setFeedback(null);
            if (!projectId && projects[0]) chooseProject(projects[0].id);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
        >
          <Send size={15} />
          Projeye Davet Et
        </button>
      )}

      {feedback && (
        <p className={`mt-3 text-sm ${feedback.tone === "success" ? "text-green-700" : "text-red-700"}`}>
          {feedback.text}
        </p>
      )}

      {open && (
        <div className="mt-4 max-w-xl space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
          <select
            value={projectId}
            onChange={(e) => chooseProject(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>

          <select
            value={role}
            onChange={(e) => chooseRole(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
          >
            {roleOptions.map((option) => (
              <option key={option.name} value={option.name} disabled={option.isFull}>
                {option.name}
                {option.isFull ? " — Kontenjan dolu" : ""}
              </option>
            ))}
          </select>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min={1}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Bütçe (₺)"
              className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
            />
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Süre (ör. 14 gün)"
              className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
            />
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Freelancer'a kısa bir not (opsiyonel)"
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void sendInvitation()}
              disabled={busy || !projectId || !role || Boolean(roleOptions.find((r) => r.name === role)?.isFull)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              Daveti Gönder
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
