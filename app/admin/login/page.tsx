import { Suspense } from "react";
import Image from "next/image";

import AdminLoginForm from "./AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image src="/logo.png" alt="CollaCrew" width={147} height={28} priority />
          <p className="text-sm text-[#6b7280]">Yönetim Paneli Girişi</p>
        </div>

        <div className="border border-[#e5e7eb] bg-white p-6">
          <Suspense fallback={null}>
            <AdminLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
