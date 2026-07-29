"use client";

import { useState } from "react";
import Link from "next/link";

export default function FreelancerRegister() {


  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");



  const rules = [
    {
      text: "En az 8 karakter",
      valid: password.length >= 8,
    },
    {
      text: "En az bir büyük harf",
      valid: /[A-Z]/.test(password),
    },
    {
      text: "En az bir rakam",
      valid: /[0-9]/.test(password),
    },
  ];



  const passwordsMatch =
    confirmPassword.length > 0 &&
    password === confirmPassword;



  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fafafa] px-6">


      <div className="bg-white rounded-3xl shadow-sm p-10 w-full max-w-xl">


        <h1 className="text-3xl font-bold">
          Freelancer hesabı oluştur
        </h1>


        <p className="text-gray-500 mt-3">
          Profilini oluştur, yeteneklerini göster ve projelere başvur.
        </p>





        <div className="mt-8 space-y-4">



          <input
            placeholder="Ad"
            className="w-full border rounded-xl px-5 py-4"
          />



          <input
            placeholder="Soyad"
            className="w-full border rounded-xl px-5 py-4"
          />



          <input
            type="email"
            placeholder="E-posta adresi"
            className="w-full border rounded-xl px-5 py-4"
          />



          <input
            type="tel"
            placeholder="Telefon numarası"
            className="w-full border rounded-xl px-5 py-4"
          />





          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            className="w-full border rounded-xl px-5 py-4"
          />




          <div className="bg-gray-50 rounded-xl p-4 space-y-2">


            {
              rules.map((rule)=>(
                <div
                  key={rule.text}
                  className={`flex items-center gap-2 text-sm ${
                    rule.valid
                    ? "text-green-600"
                    : "text-red-500"
                  }`}
                >

                  <span>
                    {
                      rule.valid
                      ? "✓"
                      : "✕"
                    }
                  </span>


                  {rule.text}

                </div>
              ))
            }


          </div>






          <input
            type="password"
            placeholder="Şifre tekrar"
            value={confirmPassword}
            onChange={(e)=>setConfirmPassword(e.target.value)}
            className="w-full border rounded-xl px-5 py-4"
          />




          {
            confirmPassword.length > 0 && (

              <div
                className={`text-sm flex items-center gap-2 ${
                  passwordsMatch
                  ? "text-green-600"
                  : "text-red-500"
                }`}
              >

                <span>
                  {
                    passwordsMatch
                    ? "✓"
                    : "✕"
                  }
                </span>


                {
                  passwordsMatch
                  ? "Şifreler eşleşiyor"
                  : "Şifreler eşleşmiyor"
                }


              </div>

            )
          }







          <label className="flex items-start gap-3 text-sm text-gray-500">


            <input
              type="checkbox"
              className="mt-1"
            />


            Kullanım koşullarını ve gizlilik politikasını kabul ediyorum.


          </label>





          <Link
            href="/register/freelancer/verify"
            className="block text-center w-full bg-black text-white py-4 rounded-full mt-4"
          >

            Hesap Oluştur

          </Link>




        </div>


      </div>


    </main>
  );
}