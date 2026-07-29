import Link from "next/link";


export default function ClientDashboard() {


  const stats = [
    {
      title: "Aktif Projeler",
      value: "3",
      detail: "Devam eden işler"
    },
    {
      title: "Gelen Teklifler",
      value: "12",
      detail: "Yeni teklif"
    },
    {
      title: "Çalışılan Freelancer",
      value: "8",
      detail: "Kayıtlı ekip"
    },
    {
      title: "Tamamlanan",
      value: "24",
      detail: "Başarılı proje"
    }
  ];



  const projects = [
    {
      title: "E-Ticaret Web Sitesi",
      freelancer: "UI/UX Designer",
      status: "Devam Ediyor",
      budget: "₺45.000"
    },
    {
      title: "Mobil Uygulama Tasarımı",
      freelancer: "Product Designer",
      status: "Teklif Toplanıyor",
      budget: "₺25.000"
    },
    {
      title: "Marka Kimliği",
      freelancer: "Graphic Designer",
      status: "Tamamlandı",
      budget: "₺15.000"
    }
  ];



  return (

    <main className="p-8">

      {/* HEADER */}

      <div className="flex items-center justify-between mb-10">


        <div>

          <h1 className="text-3xl font-semibold">
            Hoş geldiniz 👋
          </h1>


          <p className="text-gray-500 mt-2">
            Projelerinizi yönetin ve doğru freelancerları bulun.
          </p>

        </div>



        <Link

          href="/client/create-project"

          className="
          bg-black
          text-white
          px-6
          py-3
          rounded-xl
          font-medium
          "

        >

          + Yeni Proje

        </Link>


      </div>






      {/* STATS */}

      <div className="grid md:grid-cols-4 gap-5">


        {
          stats.map((item,index)=>(


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


              <p className="text-sm text-gray-500">
                {item.title}
              </p>


              <h2 className="text-3xl font-semibold mt-3">
                {item.value}
              </h2>


              <p className="text-xs text-gray-400 mt-2">
                {item.detail}
              </p>


            </div>


          ))
        }


      </div>







      {/* PROJECTS */}


      <section className="mt-10">


        <div className="flex justify-between items-center mb-5">


          <h2 className="text-xl font-semibold">
            Son Projeler
          </h2>


          <Link

            href="/client/projects"

            className="text-sm text-gray-500"

          >

            Tümünü Gör

          </Link>


        </div>





        <div className="space-y-4">


          {
            projects.map((project,index)=>(


              <div

                key={index}

                className="
                bg-white
                border
                border-gray-200
                rounded-2xl
                p-6
                flex
                justify-between
                items-center
                "

              >


                <div>


                  <h3 className="font-semibold">
                    {project.title}
                  </h3>


                  <p className="text-sm text-gray-500 mt-2">
                    {project.freelancer}
                  </p>


                </div>




                <div className="text-right">


                  <p className="font-medium">
                    {project.budget}
                  </p>


                  <span
                    className="
                    inline-block
                    mt-2
                    bg-gray-100
                    rounded-full
                    px-4
                    py-1
                    text-xs
                    "
                  >

                    {project.status}

                  </span>


                </div>



              </div>


            ))
          }


        </div>


      </section>







      {/* QUICK ACTIONS */}


      <section className="mt-10 grid md:grid-cols-3 gap-5">


        <Link

          href="/client/freelancers"

          className="
          bg-white
          border
          rounded-2xl
          p-6
          hover:shadow-sm
          transition
          "

        >

          <h3 className="font-semibold">
            Freelancer Keşfet
          </h3>

          <p className="text-sm text-gray-500 mt-2">
            Uzmanları inceleyin ve ekip oluşturun.
          </p>


        </Link>





        <Link

          href="/client/messages"

          className="
          bg-white
          border
          rounded-2xl
          p-6
          hover:shadow-sm
          transition
          "

        >

          <h3 className="font-semibold">
            Mesajlar
          </h3>

          <p className="text-sm text-gray-500 mt-2">
            Freelancerlarla iletişim kurun.
          </p>


        </Link>






        <Link

          href="/client/projects"

          className="
          bg-white
          border
          rounded-2xl
          p-6
          hover:shadow-sm
          transition
          "

        >

          <h3 className="font-semibold">
            Projeler
          </h3>

          <p className="text-sm text-gray-500 mt-2">
            Tüm proje süreçlerini yönetin.
          </p>


        </Link>



      </section>



    </main>

  );

}