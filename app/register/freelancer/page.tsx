"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff } from "lucide-react";

export default function FreelancerRegisterPage() {

  const router = useRouter();


  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });


  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);



  const rules = [
    {
      label: "En az 8 karakter",
      valid: form.password.length >= 8,
    },
    {
      label: "En az 1 büyük harf",
      valid: /[A-Z]/.test(form.password),
    },
    {
      label: "En az 1 küçük harf",
      valid: /[a-z]/.test(form.password),
    },
    {
      label: "En az 1 rakam",
      valid: /[0-9]/.test(form.password),
    },
  ];



  const passwordValid = rules.every(
    (rule) => rule.valid
  );



  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {

    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

  }




  function handleSubmit(
    e: React.FormEvent
  ) {

    e.preventDefault();


    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.password ||
      !form.confirmPassword
    ) {

      setError("Lütfen tüm alanları doldur.");
      return;

    }



    if (!passwordValid) {

      setError("Şifre kurallarını tamamla.");
      return;

    }



    if (
      form.password !== form.confirmPassword
    ) {

      setError("Şifreler eşleşmiyor.");
      return;

    }



    setError("");

    router.push(
      "/register/freelancer/verify"
    );

  }





  return (

    <main
      className="
        min-h-screen
        bg-[#F7F8FA]
        flex
        items-center
        justify-center
        px-6
      "
    >

      <div
        className="
          w-full
          max-w-md
          bg-white
          rounded-3xl
          p-8
          shadow-sm
        "
      >


        <h1 className="text-3xl font-semibold">
          Kayıt Oluştur
        </h1>


        <p className="mt-2 text-sm text-gray-500">
          Freelancer hesabını oluşturmak için bilgilerini gir.
        </p>




        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4"
        >



          <div className="grid grid-cols-2 gap-4">

            <input
              name="firstName"
              placeholder="Ad"
              value={form.firstName}
              onChange={handleChange}
              className="
                h-12
                border
                rounded-xl
                px-4
                text-sm
                outline-none
                focus:border-black
              "
            />


            <input
              name="lastName"
              placeholder="Soyad"
              value={form.lastName}
              onChange={handleChange}
              className="
                h-12
                border
                rounded-xl
                px-4
                text-sm
                outline-none
                focus:border-black
              "
            />

          </div>




          <input
            name="email"
            type="email"
            placeholder="E-posta"
            value={form.email}
            onChange={handleChange}
            className="
              w-full
              h-12
              border
              rounded-xl
              px-4
              text-sm
              outline-none
              focus:border-black
            "
          />





          {/* Şifre */}

          <div className="relative">

            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Şifre"
              value={form.password}
              onChange={handleChange}
              className="
                w-full
                h-12
                border
                rounded-xl
                px-4
                pr-12
                text-sm
                outline-none
                focus:border-black
              "
            />


            <button
              type="button"
              onClick={() =>
                setShowPassword(!showPassword)
              }
              className="
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                text-gray-400
                hover:text-black
              "
            >

              {
                showPassword
                ? <EyeOff size={18}/>
                : <Eye size={18}/>
              }

            </button>


          </div>





          {/* Şifre Kuralları */}

          <div
            className="
              rounded-xl
              bg-gray-50
              p-4
              space-y-2
            "
          >

            {
              rules.map((rule)=>(
                <div
                  key={rule.label}
                  className="
                    flex
                    items-center
                    gap-2
                    text-sm
                  "
                >

                  <div
                    className={`
                      w-5
                      h-5
                      rounded-full
                      flex
                      items-center
                      justify-center
                      ${
                        rule.valid
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-400"
                      }
                    `}
                  >

                    <Check size={12}/>

                  </div>


                  <span
                    className={
                      rule.valid
                      ? "text-gray-900"
                      : "text-gray-500"
                    }
                  >
                    {rule.label}
                  </span>


                </div>
              ))
            }

          </div>





          {/* Şifre Tekrar */}

          <div className="relative">

            <input
              name="confirmPassword"
              type={
                showConfirmPassword
                ? "text"
                : "password"
              }
              placeholder="Şifre Tekrar"
              value={form.confirmPassword}
              onChange={handleChange}
              className="
                w-full
                h-12
                border
                rounded-xl
                px-4
                pr-12
                text-sm
                outline-none
                focus:border-black
              "
            />


            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
              className="
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                text-gray-400
                hover:text-black
              "
            >

              {
                showConfirmPassword
                ? <EyeOff size={18}/>
                : <Eye size={18}/>
              }

            </button>


          </div>





          {
            error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )
          }





          <button
            type="submit"
            className="
              w-full
              h-12
              rounded-xl
              bg-black
              text-white
              text-sm
              font-medium
              hover:bg-gray-800
              transition
            "
          >
            Kayıt Oluştur
          </button>



        </form>


      </div>


    </main>

  );

}