import Link from "next/link";


export default function Home() {

  const categories = [
    "UI/UX Tasarım",
    "Yazılım",
    "Grafik Tasarım",
    "Dijital Pazarlama",
    "Video & Animasyon",
    "3D & Mimari",
  ];


  const stats = [
    {
      value: "10K+",
      label: "Freelancer",
    },
    {
      value: "5K+",
      label: "Tamamlanan Proje",
    },
    {
      value: "98%",
      label: "Memnuniyet",
    },
  ];



  return (

    <main className="bg-white text-gray-900">


      {/* NAVBAR */}

      <header
        className="
          h-20
          px-10
          flex
          items-center
          justify-between
          border-b
          border-gray-100
        "
      >

        <Link
          href="/"
          className="
            text-2xl
            font-bold
          "
        >
          HireHub
        </Link>



        <nav
          className="
            hidden
            md:flex
            gap-8
            text-sm
            text-gray-600
          "
        >

          <Link href="/freelancers">
            Freelancerlar
          </Link>

          <Link href="/premium" className="font-medium text-gray-900">
            Premium
          </Link>

          <span>
            Projeler
          </span>

          <span>
            Nasıl Çalışır?
          </span>

          <span>
            Hakkımızda
          </span>

        </nav>





        <div className="flex gap-3">


          {/* Giriş */}

          <Link

            href="/login"

            className="
              px-5
              py-2.5
              rounded-xl
              border
              border-gray-200
              text-sm
            "

          >

            Giriş Yap

          </Link>





          {/* Rol Seçimi */}

          <Link

            href="/auth/role-selection"

            className="
              px-5
              py-2.5
              rounded-xl
              bg-black
              text-white
              text-sm
            "

          >

            Başla

          </Link>



        </div>



      </header>








      {/* HERO */}

      <section

        className="
          px-10
          py-24
          grid
          lg:grid-cols-2
          gap-16
          items-center
        "

      >



        <div>


          <h1

            className="
              text-5xl
              lg:text-6xl
              font-semibold
              leading-tight
            "

          >

            Projelerini
            <br />
            doğru yeteneklerle
            <br />
            hayata geçir.

          </h1>





          <p

            className="
              mt-6
              max-w-xl
              text-lg
              text-gray-500
            "

          >

            CollaCrew, müşterileri profesyonel freelancerlar
            ve ekiplerle buluşturan yeni nesil çalışma
            platformudur.

          </p>







          <div

            className="
              mt-8
              flex
              gap-4
              flex-wrap
            "

          >


            {/* Client Register */}

            <Link

              href="/register/client"

              className="
                px-7
                py-4
                rounded-xl
                bg-black
                text-white
                font-medium
              "

            >

              Freelancer Bul

            </Link>





            {/* Freelancer Register */}

            <Link

              href="/register/freelancer"

              className="
                px-7
                py-4
                rounded-xl
                border
                border-gray-200
                font-medium
              "

            >

              Freelancer Ol / Ekip Kur

            </Link>



          </div>




        </div>









        {/* MARKETPLACE MOCKUP */}

        <div

          className="
            bg-gray-100
            rounded-3xl
            p-6
          "

        >


          <div

            className="
              bg-white
              rounded-2xl
              p-6
              shadow-sm
            "

          >


            <div className="flex justify-between mb-6">


              <div>

                <p className="text-sm text-gray-500">
                  Aranan Uzman
                </p>


                <h3 className="text-xl font-semibold">
                  Product Designer
                </h3>


              </div>


              <span

                className="
                  bg-black
                  text-white
                  px-3
                  py-2
                  rounded-lg
                  text-xs
                "

              >

                Yeni

              </span>


            </div>





            <div className="space-y-4">


              {
                [
                  "UI/UX Designer",
                  "Frontend Developer",
                  "3D Artist",
                ].map((item,index)=>(


                  <div

                    key={index}

                    className="
                      flex
                      items-center
                      gap-4
                      bg-gray-50
                      rounded-xl
                      p-4
                    "

                  >


                    <div

                      className="
                        w-10
                        h-10
                        rounded-full
                        bg-black
                      "

                    />


                    <div>

                      <p className="text-sm font-medium">
                        {item}
                      </p>


                      <p className="text-xs text-gray-500">
                        Doğrulanmış uzman
                      </p>


                    </div>


                  </div>


                ))
              }


            </div>





            <div

              className="
                mt-6
                bg-black
                text-white
                rounded-xl
                p-4
                text-sm
              "

            >

              12 uzman bulundu →
              Koalisyon oluştur

            </div>




          </div>


        </div>




      </section>









      {/* STATS */}

      <section

        className="
          px-10
          pb-20
          grid
          md:grid-cols-3
          gap-5
        "

      >

        {
          stats.map((item,index)=>(

            <div

              key={index}

              className="
                border
                border-gray-200
                rounded-2xl
                p-8
              "

            >

              <h3 className="text-3xl font-semibold">
                {item.value}
              </h3>


              <p className="mt-2 text-gray-500">
                {item.label}
              </p>


            </div>

          ))
        }

      </section>









      {/* CATEGORIES */}

      <section

        className="
          px-10
          py-20
          bg-gray-50
        "

      >


        <h2 className="text-3xl font-semibold mb-8">
          Uzmanlık Alanları
        </h2>


        <div

          className="
            grid
            md:grid-cols-3
            gap-5
          "

        >

          {
            categories.map((item,index)=>(

              <div

                key={index}

                className="
                  bg-white
                  border
                  border-gray-200
                  rounded-2xl
                  p-6
                "

              >

                {item}

              </div>

            ))
          }


        </div>


      </section>



    </main>

  );

}