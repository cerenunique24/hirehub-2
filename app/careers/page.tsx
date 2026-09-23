"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Paperclip, UploadCloud, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import {
  CAREER_FILES_ACCEPT_ATTR,
  CAREER_FILES_ALLOWED_MIME_TYPES,
  CAREER_FILES_FORMATS_LABEL,
  CAREER_FILES_MAX_TOTAL_BYTES,
  formatBytes,
  isValidCareerEmail,
} from "@/lib/careers";

/**
 * /careers — "Join the CollaCrew team" general application form.
 *
 * Not the freelancer marketplace signup (/register/freelancer). This is a
 * small public page for people who want to work at/with CollaCrew itself.
 * There are no open positions wired up yet, so that section always shows
 * the honest empty state and the form below is a general application.
 */

const EXTENSION_MIME_FALLBACK: Record<string, (typeof CAREER_FILES_ALLOWED_MIME_TYPES)[number]> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  zip: "application/zip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

function resolveMimeType(file: File): string | null {
  if (CAREER_FILES_ALLOWED_MIME_TYPES.includes(file.type as (typeof CAREER_FILES_ALLOWED_MIME_TYPES)[number])) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME_FALLBACK[extension] ?? null;
}

type PickedFile = { file: File; mimeType: string };

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function CareersPage() {
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [expertise, setExpertise] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [fileError, setFileError] = useState("");

  const [state, setState] = useState<SubmitState>("idle");
  const [formError, setFormError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [failedFileNames, setFailedFileNames] = useState<string[]>([]);

  const totalBytes = files.reduce((sum, f) => sum + f.file.size, 0);
  const submitting = state === "submitting";

  function addFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    setFileError("");

    const next: PickedFile[] = [];
    const rejected: string[] = [];
    let runningTotal = totalBytes;

    for (const file of Array.from(selected)) {
      const mimeType = resolveMimeType(file);

      if (!mimeType) {
        rejected.push(file.name);
        continue;
      }

      if (runningTotal + file.size > CAREER_FILES_MAX_TOTAL_BYTES) {
        setFileError(`Toplam dosya boyutu 3 GB sınırını aşamaz — "${file.name}" eklenmedi.`);
        break;
      }

      runningTotal += file.size;
      next.push({ file, mimeType });
    }

    if (rejected.length > 0) {
      setFileError(`Desteklenmeyen format: ${rejected.join(", ")}. İzin verilenler: ${CAREER_FILES_FORMATS_LABEL}.`);
    }

    if (next.length > 0) {
      setFiles((prev) => [...prev, ...next]);
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setFormError("");

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !expertise.trim() || !introduction.trim()) {
      setFormError("Lütfen tüm alanları doldur.");
      return;
    }

    if (!isValidCareerEmail(email)) {
      setFormError("Geçerli bir e-posta adresi gir.");
      return;
    }

    setState("submitting");
    setFailedFileNames([]);

    try {
      const applyResponse = await fetch("/api/careers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          expertise: expertise.trim(),
          introduction: introduction.trim(),
        }),
      });

      const applyData = await applyResponse.json().catch(() => ({}));

      if (!applyResponse.ok || !applyData.applicationId) {
        setFormError(applyData?.error || "Başvuru gönderilemedi.");
        setState("error");
        return;
      }

      const applicationId: string = applyData.applicationId;
      const failed: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const { file, mimeType } = files[i];
        setUploadStatus(`Dosya yükleniyor: ${file.name} (${i + 1}/${files.length})`);

        try {
          const urlResponse = await fetch("/api/careers/apply/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationId,
              fileName: file.name,
              fileType: mimeType,
              fileSize: file.size,
            }),
          });

          const urlData = await urlResponse.json().catch(() => ({}));

          if (!urlResponse.ok || !urlData.path || !urlData.token) {
            failed.push(file.name);
            continue;
          }

          const { error: uploadError } = await supabase.storage
            .from("career-applications")
            .uploadToSignedUrl(urlData.path, urlData.token, file);

          if (uploadError) {
            failed.push(file.name);
            continue;
          }

          const confirmResponse = await fetch("/api/careers/apply/confirm-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationId,
              path: urlData.path,
              fileName: file.name,
              fileType: mimeType,
              fileSize: file.size,
            }),
          });

          if (!confirmResponse.ok) {
            failed.push(file.name);
          }
        } catch {
          failed.push(file.name);
        }
      }

      setUploadStatus("");
      setFailedFileNames(failed);
      setState("success");
    } catch (error) {
      console.error("[Careers] submit error:", error);
      setFormError("Başvuru gönderilirken bir hata oluştu. Lütfen tekrar dene.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="min-h-screen bg-white">
        <CareersHeader />

        <main className="mx-auto max-w-xl px-6 py-20 text-center sm:px-0">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-success-50)] text-[var(--color-success-600)]">
            <CheckCircle2 size={22} />
          </span>

          <h1 className="cc-page-title mt-5 text-[var(--color-text-primary)]">Başvurun bize ulaştı</h1>

          <p className="cc-body mt-3 text-[var(--color-text-secondary)]">
            Teşekkürler{firstName ? `, ${firstName}` : ""}! Başvurunu inceleyip uygun bir pozisyon olduğunda seninle
            e-posta üzerinden iletişime geçeceğiz.
          </p>

          {failedFileNames.length > 0 && (
            <p className="mt-4 text-[13px] text-[var(--color-warning-600)]">
              Şu dosyalar yüklenemedi: {failedFileNames.join(", ")}. Başvurun yine de kaydedildi — dosyaları daha
              sonra e-posta ile iletebilirsin.
            </p>
          )}

          <Link href="/" className="mt-8 inline-flex">
            <Button variant="secondary">Ana sayfaya dön</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <CareersHeader />

      <main className="mx-auto max-w-xl px-6 py-12 sm:px-0 sm:py-16">
        <div>
          <h1 className="cc-page-title text-[var(--color-text-primary)]">CollaCrew ekibine katıl</h1>
          <p className="cc-body mt-[var(--rhythm-title-gap)] text-[var(--color-text-secondary)]">
            Şu anda açık bir pozisyon olmasa bile kendini tanıtabilir, yeteneklerini ve çalışmalarını bizimle
            paylaşabilirsin.
          </p>
        </div>

        {/* Open positions */}
        <section className="mt-10">
          <h2 className="cc-h3 text-[var(--color-text-primary)]">Açık Pozisyonlar</h2>
          <div className="mt-3 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] px-4 py-4">
            <p className="cc-body-sm text-[var(--color-text-secondary)]">Şu anda açık bir pozisyon bulunmuyor.</p>
            <p className="cc-body-sm mt-1 text-[var(--color-text-secondary)]">
              Yine de genel başvuru gönderebilirsin.
            </p>
          </div>
        </section>

        {/* General application */}
        <section className="mt-10 border-t border-[var(--color-border-subtle)] pt-10">
          <h2 className="cc-h3 text-[var(--color-text-primary)]">Genel Başvuru</h2>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ad" htmlFor="firstName">
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Adın"
                  autoComplete="given-name"
                  disabled={submitting}
                  maxLength={80}
                />
              </Field>

              <Field label="Soyad" htmlFor="lastName">
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Soyadın"
                  autoComplete="family-name"
                  disabled={submitting}
                  maxLength={80}
                />
              </Field>
            </div>

            <Field label="E-posta" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                autoComplete="email"
                disabled={submitting}
                maxLength={254}
              />
            </Field>

            <Field label="Uzmanlık alanı" htmlFor="expertise">
              <Input
                id="expertise"
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                placeholder="Örn. Product Design, Backend Development, Growth"
                disabled={submitting}
                maxLength={120}
              />
            </Field>

            <Field label="Kısaca kendini tanıt" htmlFor="introduction">
              <Textarea
                id="introduction"
                value={introduction}
                onChange={(e) => setIntroduction(e.target.value)}
                placeholder="Deneyimin, ilgi alanların ve CollaCrew'da neden yer almak istediğin hakkında birkaç cümle yaz."
                rows={5}
                disabled={submitting}
                maxLength={4000}
              />
            </Field>

            <Field
              label="CV / Portfolyo / ilgili doküman"
              htmlFor="career-files"
              hint={`${CAREER_FILES_FORMATS_LABEL} · başvuru başına toplam en fazla 3 GB`}
            >
              <input
                ref={fileInputRef}
                id="career-files"
                type="file"
                multiple
                accept={CAREER_FILES_ACCEPT_ATTR}
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
                disabled={submitting}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                className="flex h-[var(--input-height)] w-full items-center gap-2 rounded-[var(--radius-input)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-[var(--input-padding-x)] text-left text-[length:var(--font-size-body)] text-[var(--color-text-secondary)] outline-none transition hover:border-[var(--color-primary-600)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UploadCloud size={16} className="shrink-0 text-[var(--color-text-muted)]" />
                Dosya seç
              </button>

              {fileError && <p className="mt-1.5 text-xs text-[var(--color-error-600)]">{fileError}</p>}

              {files.length > 0 && (
                <ul className="mt-2.5 space-y-1.5">
                  {files.map((item, index) => (
                    <li
                      key={`${item.file.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-[13px] text-[var(--color-text-primary)]">
                        <Paperclip size={13} className="shrink-0 text-[var(--color-text-muted)]" />
                        <span className="truncate">{item.file.name}</span>
                        <span className="shrink-0 text-[var(--color-text-muted)]">{formatBytes(item.file.size)}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        disabled={submitting}
                        aria-label={`${item.file.name} dosyasını kaldır`}
                        className="shrink-0 text-[var(--color-text-muted)] transition hover:text-[var(--color-error-600)] disabled:cursor-not-allowed"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Field>

            {formError && (
              <p className="rounded-[var(--radius-input)] border border-red-200 bg-[var(--color-error-50)] px-3 py-2.5 text-sm text-[var(--color-error-600)]">
                {formError}
              </p>
            )}

            {uploadStatus && <p className="text-[13px] text-[var(--color-text-secondary)]">{uploadStatus}</p>}

            <Button type="submit" size="lg" loading={submitting} className="w-full">
              {submitting ? "Gönderiliyor..." : "Başvuru Gönder"}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}

function CareersHeader() {
  return (
    <header className="border-b border-[var(--color-border-subtle)] px-6 py-5 sm:px-10">
      <div className="mx-auto flex max-w-xl items-center justify-between">
        <Logo />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft size={14} />
          Ana sayfaya dön
        </Link>
      </div>
    </header>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="cc-label mb-[var(--rhythm-label-gap)] block text-[var(--color-text-primary)]">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">{hint}</p>}
    </div>
  );
}
