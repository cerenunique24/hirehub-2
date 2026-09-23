"use client";

import { useState } from "react";
import { Sparkles, FolderKanban, Users, Bell, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import Divider from "@/components/ui/Divider";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Tooltip } from "@/components/ui/Tooltip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";

export function DesignSystemPlayground() {
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  const badgeTones: BadgeTone[] = ["neutral", "primary", "ai", "success", "warning", "error", "info"];

  return (
    <main className="mx-auto max-w-5xl space-y-16 px-6 py-16">
      <PageHeader
        title="CollaCrew Design System"
        description="Living reference for tokens and shared components. Development-only — not linked from product navigation."
      />

      <Section title="Colors">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Swatch name="Primary 600" varName="--color-primary-600" />
          <Swatch name="Primary 700" varName="--color-primary-700" />
          <Swatch name="Primary 50" varName="--color-primary-50" light />
          <Swatch name="AI 600" varName="--color-ai-600" />
          <Swatch name="AI 50" varName="--color-ai-50" light />
          <Swatch name="Success 600" varName="--color-success-600" />
          <Swatch name="Warning 600" varName="--color-warning-600" />
          <Swatch name="Error 600" varName="--color-error-600" />
          <Swatch name="Info 600" varName="--color-info-600" />
          <Swatch name="Text primary" varName="--color-text-primary" />
          <Swatch name="Text secondary" varName="--color-text-secondary" />
          <Swatch name="Text muted" varName="--color-text-muted" />
          <Swatch name="Border subtle" varName="--color-border-subtle" light />
          <Swatch name="Border strong" varName="--color-border-strong" light />
          <Swatch name="Canvas" varName="--color-canvas" light />
          <Swatch name="Surface 2" varName="--color-surface-2" light />
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-4">
          <p className="cc-display">Display — cc-display</p>
          <p className="cc-page-title">Page title — cc-page-title</p>
          <p className="cc-h1">Heading 1 — cc-h1</p>
          <p className="cc-h2">Heading 2 — cc-h2</p>
          <p className="cc-h3">Heading 3 — cc-h3</p>
          <p className="cc-body">Body text — cc-body — used for most product copy.</p>
          <p className="cc-small text-[var(--color-text-secondary)]">Small — cc-small</p>
          <p className="cc-caption text-[var(--color-text-muted)]">Caption — cc-caption</p>
          <p className="cc-label text-[var(--color-text-secondary)]">LABEL — cc-label</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="link">Link button</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Default</Button>
          <Button size="lg">Large</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button variant="primary">
            <Sparkles size={15} /> With icon
          </Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          {badgeTones.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-lg gap-4">
          <Input placeholder="Text input" />
          <Input placeholder="Error state" hasError />
          <Input placeholder="Disabled" disabled />
          <Select
            options={[
              { label: "Frontend Developer", value: "frontend" },
              { label: "Backend Developer", value: "backend" },
            ]}
          />
          <Textarea placeholder="Textarea" />
          <Checkbox label="I agree to the terms" />
          <Divider />
        </div>
      </Section>

      <Section title="Avatars">
        <div className="flex items-center gap-3">
          <Avatar name="Ada Lovelace" size="sm" />
          <Avatar name="Grace Hopper" size="md" />
          <Avatar name="Alan Turing" size="lg" />
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="cc-h3">Standard card</p>
            <p className="cc-body mt-1 text-[var(--color-text-secondary)]">
              White surface, subtle border, 20px padding.
            </p>
          </Card>
          <Card hoverable>
            <p className="cc-h3">Interactive card</p>
            <p className="cc-body mt-1 text-[var(--color-text-secondary)]">
              Hoverable — border darkens, subtle elevation appears.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "overview", label: "Overview" },
            { value: "proposals", label: "Proposals", count: 3 },
            { value: "activity", label: "Activity" },
          ]}
        />
      </Section>

      <Section title="Tooltip & Dropdown trigger">
        <div className="flex items-center gap-6">
          <Tooltip label="Bildirimler">
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas)]">
              <Bell size={16} />
            </button>
          </Tooltip>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
        </div>
      </Section>

      <Section title="Empty / loading states">
        <div className="grid gap-4 sm:grid-cols-2">
          <EmptyState
            icon={FolderKanban}
            title="Henüz proje yok"
            description="Yeni bir proje oluşturduğunda burada listelenecek."
            action={<Button size="sm">Proje Oluştur</Button>}
          />
          <div className="rounded-xl border border-[var(--color-border-subtle)] p-2">
            <Loading label="Projeler yükleniyor…" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </Section>

      <Section title="Status / match indicators">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success">Onaylandı</Badge>
          <Badge tone="warning">Beklemede</Badge>
          <Badge tone="error">Reddedildi</Badge>
          <Badge tone="ai">
            <Sparkles size={11} /> %87 eşleşme
          </Badge>
          <Badge tone="info">
            <Users size={11} /> 3 üye
          </Badge>
          <Badge tone="primary">
            <Search size={11} /> Açık rol
          </Badge>
        </div>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Örnek modal"
        description="Modal, Dropdown ve Toast aynı temel gölge/köşe/border dilini paylaşır."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={() => setModalOpen(false)}>Onayla</Button>
          </>
        }
      >
        <p className="cc-body text-[var(--color-text-secondary)]">Modal içeriği buraya gelir.</p>
      </Modal>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="cc-h2 mb-4 border-b border-[var(--color-border-subtle)] pb-3">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, varName, light = false }: { name: string; varName: string; light?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border-subtle)]">
      <div className="h-14" style={{ background: `var(${varName})` }} />
      <div className="p-2.5">
        <p className={["cc-small font-medium", light ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-primary)]"].join(" ")}>
          {name}
        </p>
        <p className="cc-caption text-[var(--color-text-muted)]">{varName}</p>
      </div>
    </div>
  );
}
