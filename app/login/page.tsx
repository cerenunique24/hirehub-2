import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import LoginHeader from "./components/LoginHeader";
import LoginForm from "./components/LoginForm";
import LoginHero from "./components/LoginHero";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1531771686035-25f47595c87a?q=80&w=1400&auto=format&fit=crop";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-[var(--color-surface-1)] lg:grid-cols-2">
      {/* Left — video panel */}
      <section className="relative hidden overflow-hidden lg:block">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          poster={HERO_IMAGE}
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/videos/login-hero.mp4" type="video/mp4" />
        </video>
        {/* Darkens the whole frame a touch, independent of what the video is doing */}
        <div className="absolute inset-0 bg-black/25" />
        {/* Strong, tall bottom fade so the text zone is reliably dark regardless of video content */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/70 to-transparent" />
        {/* Same treatment at the top, so the logo stays legible too */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />

        <div className="absolute inset-x-0 top-0 p-8">
          <Link href="/" className="inline-flex items-center transition hover:opacity-90" aria-label="CollaCrew anasayfa">
            <Image
              src="/logo-white.png"
              alt="CollaCrew"
              width={126}
              height={24}
              priority
              className="h-auto w-[126px] drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.35)]"
            />
          </Link>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-10">
          <LoginHero />
        </div>
      </section>

      {/* Right — form panel */}
      <section className="flex flex-col px-6 py-6 sm:px-10 sm:py-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center lg:hidden" aria-label="CollaCrew anasayfa">
            <Image src="/logo.png" alt="CollaCrew" width={126} height={24} priority className="h-auto w-[126px]" />
          </Link>

          <div className="ml-auto text-sm text-[var(--color-text-secondary)]">
            Hesabınız yok mu?{" "}
            <Link
              href="/register"
              className="font-semibold text-[var(--color-primary-600)] underline underline-offset-4 hover:text-[var(--color-primary-700)]"
            >
              Kayıt Ol
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-md space-y-8">
            <LoginHeader />

            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6 shadow-sm">
              <Suspense fallback={null}>
                <LoginForm />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
