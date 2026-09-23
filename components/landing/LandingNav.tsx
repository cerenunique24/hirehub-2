"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";

const NAV_LINKS = [
  { href: "#how-it-works", label: "Nasıl Çalışır?" },
  { href: "#ai-matching", label: "Özellikler" },
  { href: "#membership", label: "Üyelikler" },
  { href: "#faq", label: "SSS" },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border-subtle)] bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 sm:px-10">
        <Link href="/" className="inline-flex items-center" aria-label="CollaCrew">
          <Image src="/logo.png" alt="CollaCrew" width={126} height={24} priority />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-[var(--radius-nav)] px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)]/60 hover:text-[var(--color-text-primary)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Giriş Yap
          </Link>
          <Link href="/register" className={buttonClasses({ variant: "primary", size: "sm" })}>
            Ücretsiz Başla
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] text-[var(--color-text-primary)] md:hidden"
          aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[var(--color-border-subtle)] px-6 py-4 md:hidden">
          <nav className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2 text-sm text-[var(--color-text-secondary)]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/login" className={buttonClasses({ variant: "secondary", size: "md" })}>
              Giriş Yap
            </Link>
            <Link href="/register" className={buttonClasses({ variant: "primary", size: "md" })}>
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
