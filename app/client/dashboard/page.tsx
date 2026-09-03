"use client";

import StatCard from "../components/StatCard";
import QuickActions from "../components/QuickActions";
import ProjectOverview from "../components/ProjectOverview";
import RecentProjects from "../components/RecentProjects";
import RecentProposals from "../components/RecentProposals";
import TopFreelancers from "../components/TopFreelancers";
import TopCoalitions from "../components/TopCoalitions";
import BudgetChart from "../components/BudgetChart";

export default function ClientDashboardPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Welcome back. Here&apos;s what&apos;s happening today.
            </p>
          </div>
          <QuickActions />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Active Projects" value="12" subtitle="+2 this week" />
          <StatCard title="Pending Proposals" value="31" subtitle="Needs review" />
          <StatCard title="Coalitions" value="6" subtitle="2 AI Recommended" />
          <StatCard title="Total Budget" value="₺182K" subtitle="Current projects" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ProjectOverview />
          </div>
          <BudgetChart />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentProjects />
          <RecentProposals />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopFreelancers />
          <TopCoalitions />
        </div>
      </div>
    </div>
  );
}
