"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import Input from "./ui/Input";
import Button from "./ui/Button";

import RememberSection from "./RememberSection";
import SocialLogin from "./SocialLogin";


export default function LoginForm() {

  const router = useRouter();


  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const [showPassword,setShowPassword] = useState(false);

  const [remember,setRemember] = useState(false);

  const [error,setError] = useState("");

  const [loading,setLoading] = useState(false);



  function handleSubmit(
    e:React.FormEvent
  ){

    e.preventDefault();

    setError("");



    if(!email || !password){

      setError(
        "Lütfen tüm alanları doldurun."
      );

      return;

    }



    setLoading(true);



    setTimeout(()=>{


      if(
        email === "demo@hirehub.com" &&
        password === "123456"
      ){

        router.push(
          "/freelancers/dashboard"
        );


      }else{

        setError(
          "E-posta veya şifre hatalı."
        );

      }


      setLoading(false);


    },700);


  }



  return (

    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >


      <div className="space-y-2">

        <label className="text-sm font-medium">
          E-posta
        </label>


        <Input

          type="email"

          placeholder="mail@example.com"

          value={email}

          onChange={(e)=>
            setEmail(e.target.value)
          }

        />

      </div>





      <div className="space-y-2">

        <label className="text-sm font-medium">
          Şifre
        </label>


        <div className="relative">

          <Input

            type={
              showPassword
              ? "text"
              : "password"
            }

            placeholder="••••••••"

            value={password}

            onChange={(e)=>
              setPassword(e.target.value)
            }

          />


          <button

            type="button"

            onClick={()=>
              setShowPassword(!showPassword)
            }

            className="
            absolute
            right-3
            top-1/2
            -translate-y-1/2
            text-gray-400
            "

          >

            {
              showPassword
              ?
              <EyeOff size={18}/>
              :
              <Eye size={18}/>
            }


          </button>


        </div>

      </div>






      <RememberSection

        checked={remember}

        setChecked={setRemember}

      />






      {
        error &&

        <p className="
          text-sm
          text-red-500
        ">
          {error}
        </p>

      }





      <Button

        type="submit"

        disabled={loading}

        className="w-full"

      >

        {
          loading
          ?
          "Giriş yapılıyor..."
          :
          "Giriş Yap"
        }


      </Button>





      <SocialLogin />


    </form>

  );
}