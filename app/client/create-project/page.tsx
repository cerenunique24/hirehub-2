"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import AnalyzingState from "@/components/ai/AnalyzingState";
import ProjectAnalysisDisplay from "@/components/ai/ProjectAnalysisDisplay";
import ProjectReviewEditor from "@/components/ai/ProjectReviewEditor";
import TalentMatchingPanel from "@/components/ai/TalentMatchingPanel";
import CrewRecommendationPanel from "@/components/ai/CrewRecommendationPanel";
import type {
  CrewRecommendation,
  ProjectAnalysis,
  ProjectBrief,
  ProjectLifecycleStage,
  TalentMatchingResult,
} from "@/types/ai";

type Step =
  | "create"
  | "analyzing"
  | "analysis"
  | "review"
  | "talent"
  | "crew"
  | "approval";

export default function CreateProjectPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("create");
  const [lifecycleStage, setLifecycleStage] =
    useState<ProjectLifecycleStage>("draft");

  const [brief, setBrief] = useState<ProjectBrief>({
    title: "",
    description: "",
    budget: "",
    deadline: "",
  });

  const [aiAnalysis, setAiAnalysis] = useState<ProjectAnalysis | null>(null);
  const [userAnalysis, setUserAnalysis] = useState<ProjectAnalysis | null>(null);
  const [matching, setMatching] = useState<TalentMatchingResult | null>(null);
  const [crew, setCrew] = useState<CrewRecommendation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const activeAnalysis = userAnalysis ?? aiAnalysis;

  async function analyzeProject() {
    if (!brief.description.trim()) {
      setError("Please describe your project first.");
      return;
    }

    setError("");
    setLoading(true);
    setStep("analyzing");
    setLifecycleStage("analyzing");

    try {
      const response = await fetch("/api/ai/analyze-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      setAiAnalysis(data.analysis);
      setUserAnalysis(data.analysis);
      setLifecycleStage("analyzed");
      setStep("analysis");
    } catch (err) {
      console.error(err);
      setError("We couldn't analyze your project. Please try again.");
      setLifecycleStage("draft");
      setStep("create");
    } finally {
      setLoading(false);
    }
  }

  async function findTalent() {
    if (!activeAnalysis) return;

    setLoading(true);
    setError("");
    setLifecycleStage("matching");

    try {
      const response = await fetch("/api/ai/match-talent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: activeAnalysis }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Talent matching failed.");
      }

      setMatching(data.matching);
      setStep("talent");
    } catch (err) {
      console.error(err);
      setError("We couldn't find talent matches. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function recommendCrewAction() {
    if (!activeAnalysis) return;

    setLoading(true);
    setError("");
    setLifecycleStage("crew_review");

    try {
      const response = await fetch("/api/ai/recommend-crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: activeAnalysis, matching }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Crew recommendation failed.");
      }

      setCrew(data.crew);
      setStep("crew");
    } catch (err) {
      console.error(err);
      setError("We couldn't build a crew recommendation. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function approveAndPublish() {
    setLifecycleStage("ready_to_publish");
    setStep("approval");
  }

  function finishPublishing() {
    setLifecycleStage("published");
    router.push("/client/projects");
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <StepIndicator current={step} stage={lifecycleStage} />

        {step === "analyzing" && <AnalyzingState />}

        {step === "analysis" && activeAnalysis && (
          <>
            <StepHeader
              title="We understand your project."
              subtitle="Review the AI analysis before editing or finding talent."
              onBack={() => setStep("create")}
            />
            <ProjectAnalysisDisplay title={brief.title} analysis={activeAnalysis} />
            <ActionBar
              primaryLabel="Review & Edit"
              onPrimary={() => {
                setLifecycleStage("reviewing");
                setStep("review");
              }}
              secondaryLabel="Edit Input"
              onSecondary={() => setStep("create")}
            />
          </>
        )}

        {step === "review" && activeAnalysis && (
          <>
            <StepHeader
              title="Review your project."
              subtitle="Edit AI recommendations before finding talent."
              onBack={() => setStep("analysis")}
            />
            <ProjectReviewEditor
              analysis={activeAnalysis}
              onChange={setUserAnalysis}
            />
            <ActionBar
              primaryLabel="Find My Talent"
              onPrimary={findTalent}
              secondaryLabel="Back to Analysis"
              onSecondary={() => setStep("analysis")}
              loading={loading}
            />
          </>
        )}

        {step === "talent" && matching && (
          <>
            <StepHeader
              title="Talent matches for your project."
              subtitle="CollaCrew found freelancers and coalitions relevant to your requirements."
              onBack={() => setStep("review")}
            />
            <TalentMatchingPanel matching={matching} />
            <ActionBar
              primaryLabel="Get AI Crew Recommendation"
              onPrimary={recommendCrewAction}
              secondaryLabel="Back to Review"
              onSecondary={() => setStep("review")}
              loading={loading}
            />
          </>
        )}

        {step === "crew" && crew && (
          <>
            <StepHeader
              title="Your recommended crew."
              subtitle="Review the suggested team. You approve before publishing."
              onBack={() => setStep("talent")}
            />
            <CrewRecommendationPanel crew={crew} />
            <ActionBar
              primaryLabel="Approve Crew"
              onPrimary={approveAndPublish}
              secondaryLabel="Back to Talent"
              onSecondary={() => setStep("talent")}
            />
          </>
        )}

        {step === "approval" && (
          <>
            <StepHeader
              title="Ready to publish."
              subtitle="Your project is reviewed and the crew is approved. Publish when ready."
              onBack={() => setStep("crew")}
            />
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              <CheckCircle2 className="mx-auto mb-4 text-green-600" size={48} />
              <h2 className="text-2xl font-semibold text-neutral-900">
                Project ready for publishing
              </h2>
              <p className="mx-auto mt-3 max-w-md text-neutral-500">
                CollaCrew will not automatically create a coalition. You can invite
                freelancers or connect with coalitions after publishing.
              </p>
              <button
                onClick={finishPublishing}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-8 py-4 font-medium text-white transition hover:bg-neutral-800"
              >
                Publish Project
                <ArrowRight size={17} />
              </button>
            </div>
          </>
        )}

        {step === "create" && (
          <>
            <div className="mb-10">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-500">
                <Sparkles size={16} />
                CollaCrew AI
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-neutral-900 md:text-5xl">
                What are you building?
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-7 text-neutral-500">
                Tell us what you want to create. CollaCrew AI will understand your
                project and identify the expertise you need.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-7 shadow-sm md:p-9">
              <div className="space-y-6">
                <InputField
                  label="Project title"
                  value={brief.title}
                  onChange={(value) => setBrief({ ...brief, title: value })}
                  placeholder="e.g. Coffee brand launch"
                />

                <TextAreaField
                  label="Tell us about your project"
                  value={brief.description}
                  onChange={(value) => setBrief({ ...brief, description: value })}
                  placeholder="Describe what you want to build, your goals, deliverables, target audience, timeline or anything else that helps us understand the project..."
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <SelectField
                    label="Budget"
                    value={brief.budget}
                    onChange={(value) => setBrief({ ...brief, budget: value })}
                    options={[
                      "",
                      "Under 5,000 TL",
                      "5,000 - 25,000 TL",
                      "25,000 - 100,000 TL",
                      "100,000+ TL",
                    ]}
                  />
                  <SelectField
                    label="Deadline"
                    value={brief.deadline}
                    onChange={(value) => setBrief({ ...brief, deadline: value })}
                    options={["", "Within 1 week", "Within 1 month", "Within 3 months"]}
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="flex items-start gap-3 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                  <Sparkles size={17} className="mt-0.5 shrink-0 text-neutral-700" />
                  <p>
                    CollaCrew AI provides recommendations. You can review and change
                    them before moving forward.
                  </p>
                </div>

                <button
                  onClick={analyzeProject}
                  disabled={!brief.description.trim() || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-black py-4 font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Analyze My Project
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StepIndicator({
  current,
  stage,
}: {
  current: Step;
  stage: ProjectLifecycleStage;
}) {
  const steps = ["create", "analysis", "review", "talent", "crew", "approval"];
  const currentIndex = steps.indexOf(current === "analyzing" ? "create" : current);

  return (
    <div className="mb-8">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
        Stage: {stage.replace(/_/g, " ")}
      </p>
      <div className="flex gap-2">
        {steps.map((item, index) => (
          <div
            key={item}
            className={`h-1.5 flex-1 rounded-full ${
              index <= currentIndex ? "bg-black" : "bg-neutral-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function StepHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <>
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-black"
      >
        <ChevronLeft size={16} />
        Back
      </button>
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-500">
          <Sparkles size={16} />
          CollaCrew AI
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900">{title}</h1>
        <p className="mt-3 text-neutral-500">{subtitle}</p>
      </div>
    </>
  );
}

function ActionBar({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  loading = false,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
  loading?: boolean;
}) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <button
        onClick={onSecondary}
        className="flex-1 rounded-full border border-neutral-200 bg-white py-4 font-medium text-neutral-800 transition hover:bg-neutral-100"
      >
        {secondaryLabel}
      </button>
      <button
        onClick={onPrimary}
        disabled={loading}
        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-black py-4 font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {loading ? "Processing..." : primaryLabel}
        {!loading && <ArrowRight size={17} />}
      </button>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-800">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-neutral-200 px-5 py-4 outline-none transition focus:border-neutral-500"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-800">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="w-full resize-none rounded-2xl border border-neutral-200 px-5 py-4 leading-7 outline-none transition focus:border-neutral-500"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-800">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-neutral-200 bg-white px-5 py-4 outline-none"
      >
        {options.map((option) => (
          <option key={option || "empty"} value={option}>
            {option || `Select ${label.toLowerCase()}`}
          </option>
        ))}
      </select>
    </div>
  );
}
