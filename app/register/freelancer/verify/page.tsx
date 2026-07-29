"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyAccount() {

  const router = useRouter();


  const [code, setCode] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    ""
  ]);


  const inputs = useRef<(HTMLInputElement | null)[]>([]);



  function handleChange(
    value: string,
    index: number
  ) {


    if (!/^[0-9]?$/.test(value)) return;


    const newCode = [...code];

    newCode[index] = value;

    setCode(newCode);



    if (
      value &&
      index < 5
    ) {

      inputs.current[index + 1]?.focus();

    }

  }





  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    index:number
  ) {


    if(
      e.key === "Backspace" &&
      !code[index] &&
      index > 0
    ){

      inputs.current[index - 1]?.focus();

    }


  }





  const isComplete = code.every(
    item => item !== ""
  );





  function verifyAccount(){

    if(!isComplete) return;


    router.push(
      "/register/freelancer/onboarding"
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
          bg-white
          rounded-3xl
          shadow-sm
          p-10
          w-full
          max-w-md
          text-center
        "
      >



        <h1
          className="
            text-3xl
            font-semibold
          "
        >
          Hesabını doğrula
        </h1>



        <p
          className="
            text-gray-500
            mt-4
          "
        >
          Telefonuna gönderilen 6 haneli kodu gir.
        </p>





        <div
          className="
            flex
            justify-center
            gap-3
            mt-10
          "
        >


          {
            code.map((item,index)=>(


              <input

                key={index}

                ref={(el)=>{
                  inputs.current[index]=el;
                }}

                value={item}

                onChange={(e)=>
                  handleChange(
                    e.target.value,
                    index
                  )
                }


                onKeyDown={(e)=>
                  handleKeyDown(
                    e,
                    index
                  )
                }


                maxLength={1}

                inputMode="numeric"


                className="
                  w-12
                  h-14
                  border
                  rounded-xl
                  text-center
                  text-xl
                  font-semibold
                  outline-none
                  focus:border-black
                "

              />


            ))
          }


        </div>





        <button

          onClick={verifyAccount}

          disabled={!isComplete}

          className={`
            w-full
            h-12
            rounded-xl
            mt-8
            text-sm
            font-medium
            transition

            ${
              isComplete
              ?
              "bg-black text-white hover:bg-gray-800"
              :
              "bg-gray-300 text-gray-500 cursor-not-allowed"
            }

          `}

        >

          Doğrula

        </button>





        <button

          className="
            mt-5
            text-sm
            text-gray-500
          "

        >

          Kodu tekrar gönder

        </button>




      </div>


    </main>

  );

}