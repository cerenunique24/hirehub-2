"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";


export default function IndividualVerifyPage() {


  const router = useRouter();


  const [code, setCode] = useState([
    "",
    "",
    "",
    "",
    "",
    ""
  ]);



  const inputs =
    useRef<(HTMLInputElement | null)[]>([]);




  function handleChange(
    value: string,
    index: number
  ) {


    if (!/^[0-9]?$/.test(value))
      return;



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
    index: number
  ) {


    if (
      e.key === "Backspace" &&
      !code[index] &&
      index > 0
    ) {

      inputs.current[index - 1]?.focus();

    }


  }






  const complete =
    code.every(
      item => item !== ""
    );






  function verify() {


    if (!complete)
      return;



    // doğrulama tamamlandı bilgisi

    localStorage.setItem(
      "individualVerified",
      "true"
    );



    router.push(
      "/register/client/individual/setup"
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

          Hesabını Doğrula

        </h1>




        <p

          className="
          text-gray-500
          mt-3
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
            code.map(
              (item,index)=>(


                <input

                  key={index}


                  ref={(el)=>
                    inputs.current[index]=el
                  }


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
                  focus:outline-none
                  focus:border-black
                  "

                />


              )
            )
          }



        </div>







        <button


          onClick={verify}


          disabled={!complete}


          className={`

          w-full
          h-12
          rounded-xl
          mt-8
          font-medium
          text-white


          ${
            complete

            ?

            "bg-black hover:bg-gray-800"

            :

            "bg-gray-300 cursor-not-allowed"

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