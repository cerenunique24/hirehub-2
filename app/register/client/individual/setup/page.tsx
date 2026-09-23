"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


export default function IndividualSetupPage() {

  const router = useRouter();


  const [city,setCity] = useState("");
  const [purpose,setPurpose] = useState("");
  const [categories,setCategories] = useState<string[]>([]);
  const [budget,setBudget] = useState("");



  const categoryOptions = [
    "UI/UX Tasarım",
    "Yazılım",
    "Grafik Tasarım",
    "Pazarlama",
    "Video & Animasyon",
    "İçerik"
  ];



  const purposeOptions = [
    "Proje yaptırmak istiyorum",
    "Uzun dönem freelancer arıyorum",
    "Ekip oluşturmak istiyorum"
  ];



  const budgetOptions = [
    "5.000 TL altı",
    "5.000 - 25.000 TL",
    "25.000 - 100.000 TL",
    "100.000 TL üzeri"
  ];



  function toggleCategory(item:string){

    if(categories.includes(item)){

      setCategories(
        categories.filter(
          x=>x!==item
        )
      );

    }else{

      setCategories([
        ...categories,
        item
      ]);

    }

  }



  const canContinue =
    city &&
    purpose &&
    categories.length > 0 &&
    budget;



  function completeProfile(){

    if(!canContinue)
      return;


    router.push(
      "/client/dashboard"
    );

  }





  return (

    <main
      className="
      min-h-screen
      bg-[var(--color-canvas)]
      flex
      items-center
      justify-center
      px-6
      "
    >


      <div
        className="
        bg-white
        w-full
        max-w-xl
        rounded-xl
        shadow-sm
        p-10
        "
      >



        <h1
          className="
          text-3xl
          font-semibold
          "
        >
          Profilini Oluştur
        </h1>


        <p
          className="
          text-gray-500
          mt-3
          "
        >
          Sana uygun freelancerları bulabilmemiz için
          birkaç bilgiye ihtiyacımız var.
        </p>





        <div className="
        mt-8
        space-y-6
        ">




          <div>

            <label className="font-medium">
              Şehir
            </label>


            <select

              value={city}

              onChange={(e)=>setCity(e.target.value)}

              className="
              w-full
              border
              rounded-xl
              px-4
              py-3
              mt-2
              "

            >

              <option value="">
                Şehir seç
              </option>

              <option>
                İstanbul
              </option>

              <option>
                Ankara
              </option>

              <option>
                İzmir
              </option>

              <option>
                Diğer
              </option>


            </select>


          </div>







          <div>

            <label className="font-medium">
              Ne arıyorsun?
            </label>


            <div className="
            flex
            flex-wrap
            gap-3
            mt-3
            ">

            {
              purposeOptions.map(item=>(

                <button

                  key={item}

                  type="button"

                  onClick={()=>setPurpose(item)}

                  className={`

                  px-4
                  py-2
                  rounded-xl
                  border

                  ${
                    purpose===item
                    ?
                    "bg-[var(--color-primary-600)] text-white"
                    :
                    "bg-white"
                  }

                  `}

                >

                  {item}

                </button>

              ))
            }


            </div>

          </div>








          <div>

            <label className="font-medium">
              İhtiyaç alanların
            </label>


            <div className="
            flex
            flex-wrap
            gap-3
            mt-3
            ">


            {
              categoryOptions.map(item=>(

                <button

                key={item}

                type="button"

                onClick={()=>toggleCategory(item)}

                className={`

                px-4
                py-2
                rounded-xl
                border

                ${
                  categories.includes(item)
                  ?
                  "bg-[var(--color-primary-600)] text-white"
                  :
                  "bg-white"
                }

                `}

                >

                  {item}

                </button>

              ))
            }


            </div>


          </div>








          <div>

            <label className="font-medium">
              Tahmini bütçe
            </label>


            <select

            value={budget}

            onChange={(e)=>setBudget(e.target.value)}

            className="
            w-full
            border
            rounded-xl
            px-4
            py-3
            mt-2
            "

            >

              <option value="">
                Bütçe seç
              </option>


              {
                budgetOptions.map(item=>(

                  <option key={item}>
                    {item}
                  </option>

                ))
              }


            </select>


          </div>







          <button

          disabled={!canContinue}

          onClick={completeProfile}

          className={`

          w-full
          py-4
          rounded-xl
          font-semibold

          ${
            canContinue
            ?
            "bg-[var(--color-primary-600)] text-white"
            :
            "bg-gray-300 text-gray-500"
          }

          `}

          >

            Kayıt Tamamla

          </button>






        </div>


      </div>


    </main>

  );

}