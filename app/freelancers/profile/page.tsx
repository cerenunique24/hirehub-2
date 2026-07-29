export default function ProfilePage() {

  const skills = [
    "UI Design",
    "UX Research",
    "Design System",
    "Figma",
    "Prototype",
  ];


  const projects = [
    {
      title:"SaaS Dashboard",
      category:"Product Design",
    },
    {
      title:"Mobile Banking App",
      category:"UI/UX",
    },
    {
      title:"E-Commerce Platform",
      category:"Web Design",
    },
  ];



  return (

    <main className="p-8 w-full">


      {/* Profil Header */}

      <div
        className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          p-8
          flex
          justify-between
          items-center
          mb-6
        "
      >


        <div className="flex gap-5 items-center">


          <img
            src="/avatars/profile.jpg"
            className="
              w-24
              h-24
              rounded-full
              object-cover
            "
          />


          <div>


            <h1 className="
              text-2xl
              font-semibold
            ">
              Ceren Koçyiğit
            </h1>


            <p className="text-gray-500 mt-1">
              UI/UX Designer
            </p>


            <div className="
              flex
              gap-5
              mt-4
              text-sm
            ">


              <span>
                ⭐ 4.9 Puan
              </span>


              <span>
                24 Proje
              </span>


              <span>
                İstanbul
              </span>


            </div>


          </div>


        </div>



        <button
          className="
            px-5
            py-3
            rounded-xl
            bg-black
            text-white
            text-sm
          "
        >
          Profili Düzenle
        </button>


      </div>





      {/* Hakkımda */}

      <section
        className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          p-6
          mb-6
        "
      >

        <h2 className="font-semibold mb-3">
          Hakkımda
        </h2>


        <p className="text-sm text-gray-600 leading-6">
          Dijital ürünler, kullanıcı deneyimi ve
          modern arayüz tasarımları üzerine
          çalışan bir UI/UX tasarımcıyım.
        </p>


      </section>






      {/* Yetenekler */}

      <section
        className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          p-6
          mb-6
        "
      >

        <h2 className="font-semibold mb-4">
          Uzmanlıklar
        </h2>



        <div className="flex gap-3 flex-wrap">


          {skills.map((skill,index)=>(

            <span
              key={index}
              className="
                px-4
                py-2
                bg-gray-100
                rounded-full
                text-sm
              "
            >
              {skill}
            </span>

          ))}


        </div>


      </section>







      {/* Portfolyo */}

      <section
        className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          p-6
        "
      >

        <h2 className="font-semibold mb-5">
          Portfolyo
        </h2>



        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-5
          "
        >


          {projects.map((project,index)=>(

            <div
              key={index}
              className="
                border
                border-gray-200
                rounded-xl
                p-5
              "
            >

              <div
                className="
                  h-32
                  bg-gray-100
                  rounded-lg
                  mb-4
                "
              />


              <h3 className="font-medium">
                {project.title}
              </h3>


              <p className="text-sm text-gray-500 mt-1">
                {project.category}
              </p>


            </div>

          ))}


        </div>


      </section>



    </main>

  );

}