"use client";

import Link from "next/link";
import {
ArrowLeft,
ArrowRight,
BriefcaseBusiness,
UserRound,
} from "lucide-react";

export default function RegisterPage() {
return ( <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-6 py-12"> <div className="w-full max-w-2xl">
{/* Header */} <div className="mb-10 text-center"> <div className="mb-6 flex justify-center"> <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white"> <BriefcaseBusiness size={24} /> </div> </div>

      <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
        CollaCrew&apos;a hoş geldiniz
      </h1>

      <p className="mt-3 text-gray-500">
        Nasıl ilerlemek istediğinizi seçin.
      </p>
    </div>

    {/* Role Selection */}
    <div className="grid gap-4 sm:grid-cols-2">
      <Link
        href="/register/freelancer"
        className="group relative rounded-3xl border border-gray-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-black hover:shadow-lg"
      >
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 transition-colors group-hover:bg-black group-hover:text-white">
          <UserRound size={22} />
        </div>

        <h2 className="text-xl font-semibold text-neutral-900">
          Freelancer
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Yeteneklerinizi sergileyin, projeleri keşfedin ve doğru
          insanlarla birlikte çalışın.
        </p>

        <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-black">
          Freelancer olarak devam et

          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-1"
          />
        </div>
      </Link>

      <Link
        href="/register/client"
        className="group relative rounded-3xl border border-gray-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-black hover:shadow-lg"
      >
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 transition-colors group-hover:bg-black group-hover:text-white">
          <BriefcaseBusiness size={22} />
        </div>

        <h2 className="text-xl font-semibold text-neutral-900">
          Proje Sahibi
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Projenizi oluşturun, doğru uzmanları bulun ve fikrinizi hayata
          geçirin.
        </p>

        <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-black">
          Proje sahibi olarak devam et

          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-1"
          />
        </div>
      </Link>
    </div>

    {/* Login */}
    <div className="mt-8 text-center">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-black"
      >
        <ArrowLeft size={16} />
        Zaten hesabınız var mı? Giriş yapın
      </Link>
    </div>
  </div>
</main>

);
}
