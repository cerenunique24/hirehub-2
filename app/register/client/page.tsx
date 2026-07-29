"use client";

import { useRouter } from "next/navigation";
import {
  User,
  Building2
} from "lucide-react";


export default function ClientRegisterType() {

  const router = useRouter();



  const selectType = (type:string) => {

    localStorage.setItem(
      "clientType",
      type
    );


    if(type === "individual"){

      router.push(
        "/register/client/individual"
      );

    }else{

      router.push(
        "/register/client/company"
      );

    }

  };



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
        max-w-4xl
        w-full
        "
      >



        <div className="text-center mb-10">


          <h1
            className="
            text-3xl
            font-semibold
            "
          >
            Hesap Türünü Seç
          </h1>


          <p
            className="
            text-gray-500
            mt-3
            "
          >
            Size uygun hesap türüyle devam edin.
          </p>


        </div>






        <div
          className="
          grid
          md:grid-cols-2
          gap-6
          "
        >




          {/* BİREYSEL */}


          <div
            className="
            bg-white
            border
            rounded-3xl
            p-8
            flex
            flex-col
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
              mb-6
              "
            >

              <User size={24}/>

            </div>




            <h2
              className="
              text-xl
              font-semibold
              "
            >
              Bireysel Hesap
            </h2>


            <p
              className="
              text-gray-500
              mt-3
              leading-6
              "
            >
              Kendi adına proje oluştur,
              freelancerlarla çalış ve süreçlerini yönet.
            </p>



            <ul
              className="
              text-sm
              text-gray-600
              mt-6
              space-y-2
              flex-1
              "
            >

              <li>✓ Kişisel profil oluştur</li>

              <li>✓ Freelancer keşfet</li>

              <li>✓ Proje yönet</li>

            </ul>




            <button

              onClick={()=>
                selectType("individual")
              }

              className="
              mt-8
              w-full
              bg-black
              text-white
              rounded-xl
              py-3.5
              font-medium
              "

            >

              Bireysel Olarak Devam Et

            </button>



          </div>








          {/* KURUMSAL */}



          <div
            className="
            bg-white
            border
            rounded-3xl
            p-8
            flex
            flex-col
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
              mb-6
              "
            >

              <Building2 size={24}/>

            </div>




            <h2
              className="
              text-xl
              font-semibold
              "
            >
              Kurumsal Hesap
            </h2>



            <p
              className="
              text-gray-500
              mt-3
              leading-6
              "
            >
              Şirketiniz adına ekip kurun,
              freelancerlarla çalışın ve projeleri yönetin.
            </p>




            <ul
              className="
              text-sm
              text-gray-600
              mt-6
              space-y-2
              flex-1
              "
            >

              <li>✓ Şirket profili oluştur</li>

              <li>✓ Ekip üyeleri ekle</li>

              <li>✓ Büyük projeleri yönet</li>


            </ul>





            <button

              onClick={()=>
                selectType("company")
              }

              className="
              mt-8
              w-full
              bg-black
              text-white
              rounded-xl
              py-3.5
              font-medium
              "

            >

              Kurumsal Olarak Devam Et

            </button>



          </div>






        </div>



      </div>


    </main>

  );

}