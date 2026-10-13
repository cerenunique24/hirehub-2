"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { projectWork, knownAmount, type DashboardMilestone } from "@/lib/projects/dashboard";
import { DashboardStatus } from "@/components/dashboard/Workspace";
import {
  FreelancerDashboardView,
  type DashboardPerson,
  type FreelancerDashboardData,
  type FreelancerProject,
  type FreelancerOpportunity,
} from "@/components/dashboard/FreelancerDashboardView";

type Proposal = { id: string; project_id: string; status: string | null; bid_amount: number | string | null; created_at: string };
type Project = { id: string; title: string; status: string | null; deadline: string | null; team_required: boolean; client_id: string | null };
type Membership = { project_id: string; freelancer_id: string; role: string | null; proposal_id: string | null; agreed_amount: number | string | null };
type Opportunity = FreelancerOpportunity;
type RoleMatch = { role: string; score: number; isEligibleForRole: boolean; budgetPerPerson?: number | null; duration?: string | null };

export default function FreelancerDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<FreelancerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunityError, setOpportunityError] = useState("");
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      setLoading(true); setError("");
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { if (active) setError("Paneli görüntülemek için giriş yapmanız gerekiyor."); return; }
      const [profileResult, proposalResult, membershipResult, invitationResult] = await Promise.all([
        supabase.rpc("get_my_full_profile").then(({ data, error }) => ({ data: Array.isArray(data) ? data[0] ?? null : null, error })),
        supabase.from("proposals").select("id, project_id, status, bid_amount, created_at").eq("freelancer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("project_team_members").select("project_id, freelancer_id, role, proposal_id, agreed_amount").eq("freelancer_id", user.id).eq("status", "active"),
        supabase.from("project_team_invitations").select("id", { count: "exact", head: true }).eq("freelancer_id", user.id).eq("status", "pending"),
      ]);
      if (profileResult.error || proposalResult.error || membershipResult.error || invitationResult.error) { if (active) setError("Panel verilerin yüklenemedi. Lütfen tekrar dene."); return; }
      const proposals = (proposalResult.data ?? []) as Proposal[];
      const memberships = (membershipResult.data ?? []) as Membership[];
      const projectIds = [...new Set([...proposals.map(p => p.project_id), ...memberships.map(m => m.project_id)])];
      const projectResult = projectIds.length ? await supabase.from("projects").select("id, title, status, deadline, team_required, client_id").in("id", projectIds) : { data: [], error: null };
      if (projectResult.error) { if (active) setError("Projelerin yüklenemedi. Lütfen tekrar dene."); return; }
      const projects = (projectResult.data ?? []) as Project[];
      const memberIds = [...new Set(memberships.map(m => m.project_id))];
      const [milestoneResult, teamResult] = await Promise.all([
        memberIds.length ? supabase.from("project_milestones").select("id, project_id, title, due_date, status, sort_order, freelancer_id, budget, approved_at").in("project_id", memberIds).order("sort_order", { ascending: true }) : Promise.resolve({ data: [], error: null }),
        memberIds.length ? supabase.from("project_team_members").select("project_id, freelancer_id").in("project_id", memberIds).eq("status", "active") : Promise.resolve({ data: [], error: null }),
      ]);
      if (milestoneResult.error || teamResult.error) { if (active) setError("Proje aşamaların yüklenemedi. Lütfen tekrar dene."); return; }
      const milestones = (milestoneResult.data ?? []) as DashboardMilestone[];
      // Optional display-only enrichment: missing profile visibility never blocks work data.
      const participantIds = [...new Set([
        ...projects.filter(project => memberIds.includes(project.id)).flatMap(project => project.client_id ? [project.client_id] : []),
        ...(teamResult.data ?? []).map(member => member.freelancer_id),
      ])];
      const people = new Map<string, DashboardPerson>();
      if (participantIds.length) {
        try {
          const profileResult = await supabase.from("profiles")
            .select("id, first_name, last_name, avatar_url").in("id", participantIds);
          if (!profileResult.error) {
            for (const person of profileResult.data ?? []) {
              people.set(person.id, {
                id: person.id,
                name: [person.first_name, person.last_name].filter(Boolean).join(" ") || null,
                avatarUrl: person.avatar_url ?? null,
              });
            }
          }
        } catch {
          // Initials/generic participant labels are enough when avatars cannot be fetched.
        }
      }
      const cards = memberships.flatMap(member => {
        const p = projects.find(p => p.id === member.project_id);
        if (!p) return [];
        const work = projectWork({ status: p.status, teamRequired: Boolean(p.team_required), viewer: "freelancer", userId: user.id,
          memberIds: (teamResult.data ?? []).filter(m => m.project_id === p.id).map(m => m.freelancer_id),
          milestones: milestones.filter(m => m.project_id === p.id) });
        return [{
          ...p, role: member.role,
          amount: knownAmount(member.agreed_amount ?? proposals.find(proposal => proposal.id === member.proposal_id)?.bid_amount),
          work, currentMilestone: work.currentMilestone,
          client: p.client_id ? people.get(p.client_id) ?? { id: p.client_id, name: null, avatarUrl: null } : null,
          team: (teamResult.data ?? []).filter(teamMember => teamMember.project_id === p.id).map(teamMember =>
            people.get(teamMember.freelancer_id) ?? { id: teamMember.freelancer_id, name: null, avatarUrl: null }),
        } satisfies FreelancerProject];
      });
      const earnings = { monthly: 0, approved: 0, remaining: 0, completed: 0, missingAmounts: false };
      for (const p of cards.filter(p => p.status === "in_progress" || p.status === "completed" || p.status === "paused")) {
        if (p.amount === null) { earnings.missingAmounts = true; continue; }
        if (p.status === "completed") { earnings.completed += p.amount; continue; }
        const ownApproved = milestones.filter(m => m.project_id === p.id && m.status === "approved" && (!p.team_required || m.freelancer_id === user.id));
        if (ownApproved.some(m => knownAmount(m.budget) === null)) { earnings.missingAmounts = true; continue; }
        const approved = Math.min(p.amount, ownApproved.reduce((sum, m) => sum + (knownAmount(m.budget) ?? 0), 0));
        earnings.approved += approved; earnings.remaining += Math.max(0, p.amount - approved);
      }
      const now = new Date();
      for (const milestone of milestones) {
        const project = projects.find(p => p.id === milestone.project_id);
        if (!project || milestone.status !== "approved" || (project.team_required && milestone.freelancer_id !== user.id) || !milestone.approved_at) continue;
        const approvedAt = new Date(milestone.approved_at);
        if (approvedAt.getFullYear() === now.getFullYear() && approvedAt.getMonth() === now.getMonth()) {
          const amount = knownAmount(milestone.budget);
          if (amount === null) earnings.missingAmounts = true;
          else earnings.monthly += amount;
        }
      }
      if (active) setData({
        profile: profileResult.data as FreelancerDashboardData["profile"],
        activeProjects: cards.filter(p => p.status === "in_progress" || p.status === "paused"),
        waitingProjects: cards.filter(p => p.status === "open" || p.status === "ready_to_start"),
        pendingInvitations: invitationResult.count ?? 0,
        pendingProposals: proposals.filter(p => p.status === "pending" || p.status === "shortlisted").length,
        shortlistedProposals: proposals.filter(p => p.status === "shortlisted").length,
        recentProposals: proposals.filter(p => p.status === "pending" || p.status === "shortlisted").slice(0, 3).map(p => ({ ...p, project: projects.find(project => project.id === p.project_id) ?? null })),
        appliedProjectIds: proposals.map(p => p.project_id),
        deliveries: milestones.flatMap(milestone => {
          const project = cards.find(card => card.id === milestone.project_id && (card.status === "in_progress" || card.status === "paused"));
          if (!project || (project.team_required && milestone.freelancer_id !== user.id)) return [];
          return [{ milestone, projectId: project.id, projectTitle: project.title }];
        }),
        earnings,
      });
    }
    void loadDashboard().catch(() => { if (active) setError("Panel yüklenemedi. Lütfen tekrar dene."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [supabase, reloadKey]);

  useEffect(() => {
    if (!data) return;
    let active = true;
    const abort = new AbortController();
    async function loadOpportunities() {
      setOpportunitiesLoading(true); setOpportunityError("");
      const result = await supabase.from("projects").select("id, title").eq("status", "open").order("created_at", { ascending: false }).limit(12);
      if (result.error) throw result.error;
      const excluded = new Set([...data!.waitingProjects.map(p => p.id), ...data!.appliedProjectIds]);
      const candidates = (result.data ?? []).filter(p => !excluded.has(p.id));
      if (!candidates.length) { if (active) setOpportunities([]); return; }
      const response = await fetch("/api/ai/match-talent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectIds: candidates.map(p => p.id) }), signal: abort.signal });
      if (!response.ok) throw new Error("Eşleşmeler yüklenemedi");
      const body = await response.json() as { matching?: Record<string, RoleMatch[]> };
      const previews = candidates.flatMap(p => {
        const best = (body.matching?.[p.id] ?? []).filter(m => m.isEligibleForRole && m.score >= 75).sort((a, b) => b.score - a.score)[0];
        return best ? [{ id: p.id, title: p.title, role: best.role, score: best.score, budgetPerPerson: best.budgetPerPerson ?? null, duration: best.duration ?? null }] : [];
      }).sort((a, b) => b.score - a.score).slice(0, 3);
      if (active) setOpportunities(previews);
    }
    void loadOpportunities().catch(() => { if (active) setOpportunityError("Eşleşmeler şu anda yüklenemedi. Fırsatları keşfet sayfasından inceleyebilirsin."); }).finally(() => { if (active) setOpportunitiesLoading(false); });
    return () => { active = false; abort.abort(); };
  }, [data, supabase]);

  if (loading || error) return <DashboardStatus loading={loading} error={error} retry={() => setReloadKey(k => k + 1)} />;
  if (!data) return null;
  return (
    <FreelancerDashboardView
      data={data}
      opportunities={opportunities}
      opportunitiesLoading={opportunitiesLoading}
      opportunityError={opportunityError}
    />
  );
}
