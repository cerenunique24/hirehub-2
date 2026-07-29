export default function HelpPage() {

  const categories = [
    {
      title: "Hesap ve Profil",
      description:
        "Profil bilgileri, hesap ayarları ve kimlik doğrulama işlemleri",
    },
    {
      title: "Projeler",
      description:
        "Projeleri keşfetme, teklif verme ve teslim süreçleri",
    },
    {
      title: "Ödemeler",
      description:
        "Kazançlar, banka bilgileri ve ödeme işlemleri",
    },
    {
      title: "Koalisyonlar",
      description:
        "Ekip oluşturma ve birlikte çalışma süreçleri",
    },
  ];


  const questions = [
    "Profil bilgilerimi nasıl güncellerim?",
    "Bir projeye nasıl teklif verebilirim?",
    "Ödemem ne zaman hesabıma aktarılır?",
    "Koalisyon nasıl oluşturabilirim?",
    "Hesap güvenliğimi nasıl sağlayabilirim?",
  ];



  return (

    <main className="p-8 w-full">


      {/* Header */}

      <div className="mb-8">

        <h1 className="text-2xl font-semibold text-gray-900">
          Yardım Merkezi
        </h1>


        <p className="text-sm text-gray-500 mt-2">
          HireHub kullanımıyla ilgili destek ve yardım içerikleri.
        </p>


      </div>






      {/* Search */}

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

        <input

          placeholder="Nasıl yardımcı olabiliriz?"

          className="
            w-full
            h-14
            px-5
            rounded-xl
            bg-gray-100
            outline-none
            text-sm
          "

        />

      </section>








      {/* Categories */}

      <section
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          gap-5
          mb-6
        "
      >


        {categories.map((item,index)=>(


          <div
            key={index}

            className="
              bg-white
              border
              border-gray-200
              rounded-2xl
              p-6
              hover:border-black
              transition
              cursor-pointer
            "
          >


            <h3 className="font-semibold">
              {item.title}
            </h3>


            <p className="
              mt-2
              text-sm
              text-gray-500
            ">
              {item.description}
            </p>


          </div>


        ))}


      </section>









      {/* FAQ */}

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


        <h2 className="
          text-lg
          font-semibold
          mb-5
        ">
          Sık Sorulan Sorular
        </h2>




        <div className="space-y-3">


          {questions.map((item,index)=>(


            <div
              key={index}

              className="
                flex
                items-center
                justify-between
                bg-gray-50
                rounded-xl
                p-4
                text-sm
              "
            >


              <span>
                {item}
              </span>


              <span className="text-gray-400">
                +
              </span>


            </div>


          ))}



        </div>



      </section>









      {/* Support Card */}

      <section

        className="
          bg-black
          rounded-2xl
          p-6
          text-white
          flex
          justify-between
          items-center
        "

      >


        <div>

          <h2 className="
            text-lg
            font-semibold
          ">
            Desteğe mi ihtiyacın var?
          </h2>


          <p className="
            mt-2
            text-sm
            text-gray-300
          ">
            Çözemediğin bir konu için destek talebi oluştur.
          </p>


        </div>




        <button

          className="
            bg-white
            text-black
            px-5
            py-3
            rounded-xl
            text-sm
            font-medium
          "

        >
          Destek Talebi Oluştur
        </button>



      </section>





    </main>

  );

}