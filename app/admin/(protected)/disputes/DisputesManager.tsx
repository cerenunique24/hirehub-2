"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { friendlyRpcError } from "@/lib/utils/rpcError";
import {
  DISPUTE_OUTCOME_LABEL,
  DISPUTE_REASON_LABEL,
  DISPUTE_STATUS_LABEL,
} from "@/lib/marketplace/labels";
import Badge from "../components/Badge";

export type AdminDispute = {
  id: string;
  projectId: string;
  projectTitle: string;
  openedByName: string;
  openerRole: "client" | "freelancer";
  againstName: string;
  reason: string;
  description: string;
  status: string;
  resolution: string | null;
  resolutionOutcome: string | null;
  createdAt: string;
};

type CaseFile = {
  project: { id: string; title: string; status: string; budget: number | null; deadline: string | null } | null;
  team: Array<{ freelancer_id: string; role: string; status: string; agreed_amount: number | null; agreed_delivery_days: number | null }>;
  milestones: Array<{ id: string; title: string; status: string; budget: number | null; due_date: string | null; payment_status: string; revision_count: number }>;
  deliveries: Array<{ id: string; milestone_id: string; attempt_no: number; message: string; status: string; submitted_at: string; review_feedback: string | null }>;
  evidence: Array<{
    id: string;
    submitted_by: string;
    note: string;
    file_path: string | null;
    file_name: string | null;
    created_at: string;
  }>;
  messages: Array<{ id: string; sender_id: string; receiver_id: string | null; content: string; created_at: string }>;
};

const STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "neutral"> = {
  open: "warning",
  under_review: "info",
  resolved: "success",
  closed: "neutral",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DisputesManager({ disputes: initial }: { disputes: AdminDispute[] }) {
  const supabase = createClient();
  const [disputes, setDisputes] = useState(initial);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cases, setCases] = useState<Record<string, CaseFile>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: string; outcome: string; resolution: string }>>({});

  async function downloadEvidence(filePath: string) {
    const { data, error } = await supabase.storage.from("dispute-evidence").createSignedUrl(filePath, 60 * 10);
    if (error || !data?.signedUrl) {
      setMessage({ tone: "error", text: "Dosya açılamadı." });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function toggle(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    if (cases[id]) return;

    setBusy(`case-${id}`);
    const { data, error } = await supabase.rpc("admin_dispute_case", { p_dispute_id: id });
    setBusy(null);

    if (error) {
      setMessage({ tone: "error", text: friendlyRpcError(error, "Dosya bilgileri yüklenemedi.") });
      return;
    }

    setCases((current) => ({ ...current, [id]: data as CaseFile }));
  }

  async function save(dispute: AdminDispute) {
    const draft = drafts[dispute.id] ?? { status: "under_review", outcome: "", resolution: "" };

    setBusy(`save-${dispute.id}`);
    setMessage(null);

    const { error } = await supabase.rpc("admin_update_dispute", {
      p_dispute_id: dispute.id,
      p_status: draft.status,
      p_resolution: draft.resolution.trim() || null,
      p_outcome: draft.outcome || null,
    });

    setBusy(null);

    if (error) {
      setMessage({ tone: "error", text: friendlyRpcError(error, "Uyuşmazlık güncellenemedi.") });
      return;
    }

    setDisputes((current) =>
      current.map((d) =>
        d.id === dispute.id
          ? {
              ...d,
              status: draft.status,
              resolution: draft.resolution.trim() || d.resolution,
              resolutionOutcome: draft.outcome || d.resolutionOutcome,
            }
          : d
      )
    );
    setMessage({ tone: "success", text: "Uyuşmazlık güncellendi; taraflara bildirim gönderildi." });
  }

  return (
    <div className="space-y-3">
      {message && (
        <div
          className={`border p-3 text-sm ${
            message.tone === "success"
              ? "border-[#bbf7d0] bg-[#F0FDF4] text-[#166534]"
              : "border-[#fecaca] bg-[#FEF2F2] text-[#991b1b]"
          }`}
        >
          {message.text}
        </div>
      )}

      {disputes.map((dispute) => {
        const isOpen = expandedId === dispute.id;
        const caseFile = cases[dispute.id];
        const draft = drafts[dispute.id] ?? { status: "under_review", outcome: "", resolution: "" };
        const isFinal = dispute.status === "resolved" || dispute.status === "closed";

        return (
          <div key={dispute.id} className="border border-[#e5e7eb] bg-white">
            <button
              type="button"
              onClick={() => void toggle(dispute.id)}
              className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-[#F7F7F8]"
            >
              <div>
                <p className="text-sm font-medium text-[#111111]">{dispute.projectTitle}</p>
                <p className="mt-0.5 text-xs text-[#6b7280]">
                  {dispute.openedByName} ({dispute.openerRole === "client" ? "Client" : "Freelancer"}) →{" "}
                  {dispute.againstName} · {DISPUTE_REASON_LABEL[dispute.reason] ?? dispute.reason} ·{" "}
                  {formatDateTime(dispute.createdAt)}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[dispute.status] ?? "neutral"}>
                {DISPUTE_STATUS_LABEL[dispute.status] ?? dispute.status}
              </Badge>
            </button>

            {isOpen && (
              <div className="space-y-5 border-t border-[#e5e7eb] p-4 text-sm">
                <p className="whitespace-pre-wrap text-[#374151]">{dispute.description}</p>

                {busy === `case-${dispute.id}` && (
                  <p className="flex items-center gap-2 text-[#6b7280]">
                    <Loader2 size={14} className="animate-spin" /> Dosya yükleniyor...
                  </p>
                )}

                {caseFile && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <section>
                      <h3 className="mb-2 font-semibold text-[#111111]">Aşamalar</h3>
                      <ul className="space-y-1 text-[#4B5563]">
                        {caseFile.milestones.map((m) => (
                          <li key={m.id}>
                            {m.title} — {m.status}, ödeme: {m.payment_status}, revizyon: {m.revision_count}
                          </li>
                        ))}
                        {caseFile.milestones.length === 0 && <li>Aşama yok.</li>}
                      </ul>
                    </section>

                    <section>
                      <h3 className="mb-2 font-semibold text-[#111111]">Teslimler</h3>
                      <ul className="space-y-1 text-[#4B5563]">
                        {caseFile.deliveries.map((d) => (
                          <li key={d.id}>
                            {d.attempt_no}. teslim ({d.status}) · {formatDateTime(d.submitted_at)} — {d.message}
                            {d.review_feedback ? ` | Geri bildirim: ${d.review_feedback}` : ""}
                          </li>
                        ))}
                        {caseFile.deliveries.length === 0 && <li>Teslim yok.</li>}
                      </ul>
                    </section>

                    <section>
                      <h3 className="mb-2 font-semibold text-[#111111]">Kanıtlar</h3>
                      <ul className="space-y-1 text-[#4B5563]">
                        {caseFile.evidence.map((e) => (
                          <li key={e.id}>
                            {formatDateTime(e.created_at)} — {e.note}
                            {e.file_path && (
                              <>
                                {" "}
                                <button
                                  type="button"
                                  onClick={() => void downloadEvidence(e.file_path!)}
                                  className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
                                >
                                  {e.file_name ?? "Dosya"}
                                </button>
                              </>
                            )}
                          </li>
                        ))}
                        {caseFile.evidence.length === 0 && <li>Kanıt eklenmemiş.</li>}
                      </ul>
                    </section>

                    <section>
                      <h3 className="mb-2 font-semibold text-[#111111]">Mesajlar (son 200)</h3>
                      <ul className="max-h-56 space-y-1 overflow-y-auto text-[#4B5563]">
                        {caseFile.messages.map((m) => (
                          <li key={m.id}>
                            {formatDateTime(m.created_at)} — {m.content}
                          </li>
                        ))}
                        {caseFile.messages.length === 0 && <li>Taraflar arasında mesaj yok.</li>}
                      </ul>
                    </section>
                  </div>
                )}

                {dispute.resolution && (
                  <div className="border border-[#bbf7d0] bg-[#F0FDF4] p-3 text-[#166534]">
                    <p className="text-xs font-medium">
                      Çözüm
                      {dispute.resolutionOutcome ? ` · ${DISPUTE_OUTCOME_LABEL[dispute.resolutionOutcome]}` : ""}
                    </p>
                    {dispute.resolution}
                  </div>
                )}

                {!isFinal && (
                  <div className="space-y-2 border-t border-[#e5e7eb] pt-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={draft.status}
                        onChange={(e) => setDrafts((c) => ({ ...c, [dispute.id]: { ...draft, status: e.target.value } }))}
                        className="h-10 border border-[#e5e7eb] bg-white px-3 text-sm"
                      >
                        <option value="under_review">İnceleniyor</option>
                        <option value="resolved">Çözüldü</option>
                        <option value="closed">Kapatıldı</option>
                      </select>
                      <select
                        value={draft.outcome}
                        onChange={(e) => setDrafts((c) => ({ ...c, [dispute.id]: { ...draft, outcome: e.target.value } }))}
                        className="h-10 border border-[#e5e7eb] bg-white px-3 text-sm"
                      >
                        <option value="">Sonuç seç (çözümde zorunlu değil)</option>
                        {Object.entries(DISPUTE_OUTCOME_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={draft.resolution}
                      onChange={(e) => setDrafts((c) => ({ ...c, [dispute.id]: { ...draft, resolution: e.target.value } }))}
                      rows={3}
                      placeholder="Çözüm açıklaması (çözüldü / kapatıldı için zorunlu)"
                      className="w-full border border-[#e5e7eb] px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void save(dispute)}
                      disabled={busy === `save-${dispute.id}`}
                      className="inline-flex h-10 items-center gap-2 bg-[#111111] px-4 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {busy === `save-${dispute.id}` && <Loader2 size={14} className="animate-spin" />}
                      Kaydet
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
