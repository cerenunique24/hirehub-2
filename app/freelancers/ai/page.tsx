"use client";
import { useEffect, useState } from "react";
import { FreelancerAssistant } from "@/components/ai-workspace/FreelancerAssistant";
import type { AIOptions } from "@/lib/ai/assistantContracts";
export default function FreelancerAIPage() {
  const [workspace, setWorkspace] = useState<AIOptions | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(""); setWorkspace(null);
      try {
        const response = await fetch("/api/ai/freelancer-workspace", { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "AI çalışma alanı yüklenemedi.");
        if (!controller.signal.aborted) setWorkspace(data as AIOptions);
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "AI çalışma alanı yüklenemedi."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [reload]);
  return <FreelancerAssistant key={reload} workspace={workspace} loading={loading} error={error} onRetry={() => setReload(value => value + 1)} />;
}
