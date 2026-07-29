"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";


export default function IndividualRegisterPage() {

  const router = useRouter();


  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);



  const passwordRules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };


  const isValid =
    firstName &&
    lastName &&
    email &&
    passwordRules.length &&
    passwordRules.uppercase &&
    passwordRules.number &&
    password === passwordConfirm;



  function handleContinue() {

    if(!isValid) return;


    localStorage.setItem(
      "clientRegisterType",
      "individual"
    );


    localStorage.setItem(
      "clientEmail",
      email
    );


    router.push(
      "/register/client/individual/verify"
    );

  }



  return (

    <main
      className="
      min-h-screen
      bg-[#fafafa]
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
          Bireysel Hesap Oluştur
        </h1>


        <p className="text-gray-500 mt-2">
          Freelancer bulmak için hesabını oluştur.
        </p>



        <div className="mt-8 space-y-4">



          <div className="grid grid-cols-2 gap-3">

            <input
              placeholder="Ad"
              value={firstName}
              onChange={(e)=>setFirstName(e.target.value)}
              className="
              border
              rounded-xl
              px-4
              py-3
              "
            />


            <input
              placeholder="Soyad"
              value={lastName}
              onChange={(e)=>setLastName(e.target.value)}
              className="
              border
              rounded-xl
              px-4
              py-3
              "
            />

          </div>




          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="
            w-full
            border
            rounded-xl
            px-4
            py-3
            "
          />





          <div className="relative">

            <input

              type={
                showPassword
                ?
                "text"
                :
                "password"
              }

              placeholder="Şifre"

              value={password}

              onChange={(e)=>setPassword(e.target.value)}

              className="
              w-full
              border
              rounded-xl
              px-4
              py-3
              pr-12
              "

            />


            <button

              type="button"

              onClick={()=>
                setShowPassword(!showPassword)
              }

              className="
              absolute
              right-4
              top-3
              text-gray-500
              "

            >

              {
                showPassword
                ?
                <EyeOff size={20}/>
                :
                <Eye size={20}/>
              }


            </button>


          </div>






          <div className="relative">

            <input

              type={
                showConfirm
                ?
                "text"
                :
                "password"
              }

              placeholder="Şifre Tekrar"

              value={passwordConfirm}

              onChange={(e)=>setPasswordConfirm(e.target.value)}

              className="
              w-full
              border
              rounded-xl
              px-4
              py-3
              pr-12
              "

            />



            <button

              type="button"

              onClick={()=>
                setShowConfirm(!showConfirm)
              }

              className="
              absolute
              right-4
              top-3
              text-gray-500
              "

            >

              {
                showConfirm
                ?
                <EyeOff size={20}/>
                :
                <Eye size={20}/>
              }


            </button>


          </div>






          <div className="text-sm text-gray-500 space-y-1 pt-2">

            <p className={passwordRules.length ? "text-green-600" : ""}>
              ✓ En az 8 karakter
            </p>

            <p className={passwordRules.uppercase ? "text-green-600" : ""}>
              ✓ En az 1 büyük harf
            </p>

            <p className={passwordRules.number ? "text-green-600" : ""}>
              ✓ En az 1 rakam
            </p>


          </div>






          <button

            onClick={handleContinue}

            disabled={!isValid}

            className={`
            w-full
            py-4
            rounded-xl
            font-semibold
            mt-4

            ${
              isValid
              ?
              "bg-black text-white"
              :
              "bg-gray-300 text-gray-500"
            }

            `}

          >

            Devam Et

          </button>



        </div>


      </div>


    </main>

  );

}