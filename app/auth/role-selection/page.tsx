"use client";

import Link from "next/link";
import { UserRound, BriefcaseBusiness } from "lucide-react";

export default function RoleSelectionPage() {
  return (
    <main className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center px-6">

      <div className="w-full max-w-4xl">

        <div className="text-center mb-10">

          <h1 className="text-3xl font-semibold">
            Nasıl devam etmek istersin?
          </h1>

          <p className="mt-3 text-gray-500">
            Hesap türünü seçerek başlayabilirsin.
          </p>

        </div>


        <div className="grid grid-cols-2 gap-6">


          {/* Freelancer */}

          <div
            className="
              bg-white
              border
              border-gray-200
              rounded-xl
              p-5
              transition
              hover:border-[var(--color-primary-600)]
              hover:shadow-md
            "
          >

            <div
              className="
                w-12
                h-12
                rounded-xl
                bg-gray-100
                flex
                items-center
                justify-center
              "
            >
              <UserRound
                size={24}
                strokeWidth={1.8}
              />
            </div>


            <h2 className="mt-5 text-xl font-semibold">
              Freelancer Ol / Ekip Kur
            </h2>


            <p className="mt-2 text-sm text-gray-500">
              Profilini oluştur, projelere teklif ver.
            </p>


            <Link
              href="/register/freelancer"
              className="
                inline-flex
                mt-6
                px-5
                py-2.5
                rounded-xl
                bg-[var(--color-primary-600)]
                text-white
                text-sm
                font-medium
                transition
                hover:bg-[var(--color-primary-700)]
              "
            >
              Devam Et
            </Link>


          </div>





          {/* Client */}

          <div
            className="
              bg-white
              border
              border-gray-200
              rounded-xl
              p-5
              transition
              hover:border-[var(--color-primary-600)]
              hover:shadow-md
            "
          >

            <div
              className="
                w-12
                h-12
                rounded-xl
                bg-gray-100
                flex
                items-center
                justify-center
              "
            >
              <BriefcaseBusiness
                size={24}
                strokeWidth={1.8}
              />
            </div>


            <h2 className="mt-5 text-xl font-semibold">
              Freelancer Bul
            </h2>


            <p className="mt-2 text-sm text-gray-500">
              Projeni oluştur, uzmanlarla çalış.
            </p>


            <Link
              href="/register/client"
              className="
                inline-flex
                mt-6
                px-5
                py-2.5
                rounded-xl
                bg-[var(--color-primary-600)]
                text-white
                text-sm
                font-medium
                transition
                hover:bg-[var(--color-primary-700)]
              "
            >
              Devam Et
            </Link>


          </div>


        </div>


      </div>


    </main>
  );
}