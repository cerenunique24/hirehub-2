"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  LifeBuoy,
  Loader2,
  Mail,
  MessageCircleQuestion,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createTicket,
  fetchHelpArticles,
  fetchOwnTickets,
  TICKET_STATUS_LABEL,
  type HelpArticle,
  type SupportTicket,
  type TicketStatus,
} from "@/lib/support";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";

const TICKET_STATUS_CLASS: Record<TicketStatus, string> = {
  open: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  waiting_user: "bg-amber-50 text-amber-700",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-gray-100 text-gray-600",
};

const CATEGORY_ICON_BG = [
  "bg-[var(--color-info-50)] text-[var(--color-info-600)]",
  "bg-emerald-50 text-emerald-600",
  "bg-amber-50 text-amber-600",
  "bg-rose-50 text-rose-600",
  "bg-sky-50 text-sky-600",
  "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
];

export default function HelpAndSupport({
  audience,
  ticketBasePath,
  projectOptions,
}: {
  audience: "client" | "freelancer";
  /** Ör. "/client/help/tickets" */
  ticketBasePath: string;
  /** Kullanıcının kendi projeleri — ticket'ı bir projeyle ilişkilendirmek için (opsiyonel). */
  projectOptions?: Array<{ id: string; title: string }>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);

  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Genel");
  const [description, setDescription] = useState("");
  const [relatedProjectId, setRelatedProjectId] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [articlesResult] = await Promise.all([fetchHelpArticles(supabase, audience)]);
      setArticles((articlesResult.data ?? []) as HelpArticle[]);

      if (user) {
        setUserId(user.id);
        const { data: ticketRows } = await fetchOwnTickets(supabase, user.id);
        setTickets((ticketRows ?? []) as SupportTicket[]);
      }

      setLoading(false);
    }

    void load();
  }, [supabase, audience]);

  const categories = [...new Set(articles.map((a) => a.category))];

  const filteredArticles = articles.filter((article) => {
    if (activeCategory && article.category !== activeCategory) return false;
    if (!search.trim()) return true;
    const haystack = `${article.question} ${article.answer} ${article.category}`.toLocaleLowerCase("tr-TR");
    return haystack.includes(search.trim().toLocaleLowerCase("tr-TR"));
  });

  const groupedByCategory = filteredArticles.reduce<Record<string, HelpArticle[]>>((acc, article) => {
    acc[article.category] = acc[article.category] ?? [];
    acc[article.category].push(article);
    return acc;
  }, {});

  const openTicketCount = tickets.filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "waiting_user").length;

  async function handleCreateTicket() {
    setFormError("");
    setFormSuccess("");

    if (!subject.trim() || !description.trim()) {
      setFormError("Konu ve açıklama gerekli.");
      return;
    }

    /*
     * userId, sayfa yüklenirken async olarak set edilir. Kullanıcı
     * formu bu tamamlanmadan doldurup gönderirse (ör. yavaş bağlantı)
     * önceden burada sessizce hiçbir şey olmuyordu — talep
     * "gönderilmiyormuş" gibi görünüyordu ama hiçbir hata da
     * gösterilmiyordu. Session'ı burada tazeleyip gerçekten
     * oturum yoksa açıkça söylüyoruz.
     */
    let effectiveUserId = userId;

    if (!effectiveUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFormError("Destek talebi oluşturmak için giriş yapmalısın. Lütfen sayfayı yenileyip tekrar dene.");
        return;
      }

      effectiveUserId = user.id;
      setUserId(user.id);
    }

    setSubmitting(true);

    const { error } = await createTicket(supabase, {
      userId: effectiveUserId,
      subject: subject.trim(),
      category,
      description: description.trim(),
      relatedProjectId: relatedProjectId || null,
      priority,
    });

    if (error) {
      console.error("Destek talebi oluşturma hatası:", error);
      setFormError(error.message || "Destek talebi oluşturulamadı.");
      setSubmitting(false);
      return;
    }

    setFormSuccess("Destek talebin oluşturuldu.");
    setSubject("");
    setDescription("");
    setRelatedProjectId("");
    setPriority("normal");
    setShowForm(false);
    setSubmitting(false);

    const { data: ticketRows } = await fetchOwnTickets(supabase, effectiveUserId);
    setTickets((ticketRows ?? []) as SupportTicket[]);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HERO / SEARCH */}
      <section className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 sm:p-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-600)] text-white">
            <Sparkles size={20} />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-gray-900">Sana nasıl yardımcı olabiliriz?</h2>
          <p className="mt-2 text-sm text-gray-500">
            Sık sorulan soruları ara ya da bir destek talebi oluşturup ekibimizle iletişime geç.
          </p>
          <div className="relative mx-auto mt-6 max-w-lg">
            <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bir konu, kelime ya da soru yaz..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-gray-400"
            />
          </div>

          {categories.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  activeCategory === null
                    ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                }`}
              >
                Tümü
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    activeCategory === cat
                      ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* FAQ */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-8">
          <div className="mb-5 flex items-center gap-2">
            <MessageCircleQuestion size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Sık Sorulan Sorular</h2>
          </div>

          {Object.keys(groupedByCategory).length === 0 ? (
            <div className="rounded-xl bg-gray-50 py-10 text-center text-sm text-gray-500">
              Aramanla eşleşen bir sonuç bulunamadı.
            </div>
          ) : (
            <div className="space-y-7">
              {Object.entries(groupedByCategory).map(([cat, items], groupIndex) => (
                <div key={cat}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                        CATEGORY_ICON_BG[groupIndex % CATEGORY_ICON_BG.length]
                      }`}
                    >
                      {cat.charAt(0).toUpperCase()}
                    </span>
                    <h3 className="text-sm font-semibold text-gray-800">{cat}</h3>
                  </div>
                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                    {items.map((article) => {
                      const isOpen = expandedId === article.id;
                      return (
                        <div key={article.id}>
                          <button
                            type="button"
                            onClick={() => setExpandedId(isOpen ? null : article.id)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                          >
                            {article.question}
                            {isOpen ? (
                              <ChevronUp size={16} className="shrink-0 text-gray-400" />
                            ) : (
                              <ChevronDown size={16} className="shrink-0 text-gray-400" />
                            )}
                          </button>
                          {isOpen && (
                            <p className="bg-gray-50/60 px-4 pb-4 pt-1 text-sm leading-6 text-gray-600">
                              {article.answer}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SUPPORT SIDEBAR */}
        <aside className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary-600)] text-white">
              <LifeBuoy size={18} />
            </div>
            <h2 className="mt-4 font-semibold text-gray-900">Aradığını bulamadın mı?</h2>
            <p className="mt-1 text-sm text-gray-500">Ekibimize bir destek talebi gönder, en kısa sürede dönüş yapalım.</p>

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <Clock3 size={13} />
              <span>{openTicketCount > 0 ? `${openTicketCount} açık talebin var` : "Açık talebin yok"}</span>
            </div>

            {formSuccess && (
              <p className="mt-4 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
                {formSuccess}
              </p>
            )}

            <Button
              type="button"
              onClick={() => {
                setFormSuccess("");
                setShowForm(true);
              }}
              className="mt-5 w-full"
            >
              <Plus size={15} />
              Destek Talebi Oluştur
            </Button>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 px-3.5 py-3 text-xs text-gray-500">
              <Mail size={14} className="shrink-0" />
              Yanıtlar ve geçmiş mesajların talep detayında görünür.
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">Destek Taleplerim</h2>
            <div className="mt-4">
              {tickets.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">Henüz bir destek talebin yok.</p>
              ) : (
                <div className="space-y-2">
                  {tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`${ticketBasePath}/${ticket.id}`}
                      className="block rounded-xl border border-gray-100 p-3.5 text-sm transition hover:border-gray-300 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-gray-900">{ticket.subject}</p>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${TICKET_STATUS_CLASS[ticket.status]}`}>
                          {TICKET_STATUS_LABEL[ticket.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long" }).format(new Date(ticket.created_at))}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <Modal
        open={showForm}
        onClose={() => {
          if (!submitting) setShowForm(false);
        }}
        title="Yeni Destek Talebi"
        description="Ekibimiz talebini inceleyip en kısa sürede dönüş yapacak."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)} disabled={submitting}>
              Vazgeç
            </Button>
            <Button type="button" onClick={() => void handleCreateTicket()} loading={submitting}>
              Gönder
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {formError && <p className="text-sm text-[var(--color-error-600)]">{formError}</p>}

          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Konu" />

          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { label: "Genel", value: "Genel" },
              { label: "Hesap", value: "Hesap" },
              { label: "Proje", value: "Proje" },
              { label: "Ödeme", value: "Ödeme" },
              { label: "Teknik sorun", value: "Teknik sorun" },
            ]}
          />

          {projectOptions && projectOptions.length > 0 && (
            <Select
              value={relatedProjectId}
              onChange={(e) => setRelatedProjectId(e.target.value)}
              options={[
                { label: "İlgili proje (opsiyonel)", value: "" },
                ...projectOptions.map((p) => ({ label: p.title, value: p.id })),
              ]}
            />
          )}

          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high")}
            options={[
              { label: "Düşük öncelik", value: "low" },
              { label: "Normal öncelik", value: "normal" },
              { label: "Yüksek öncelik", value: "high" },
            ]}
          />

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Açıklama"
            rows={4}
          />
        </div>
      </Modal>
    </div>
  );
}
