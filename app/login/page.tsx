import LoginHeader from "./components/LoginHeader";
import LoginForm from "./components/LoginForm";
import LoginHero from "./components/LoginHero";
import DemoAccounts from "./components/DemoAccounts";


export default function LoginPage(){

  return (

    <main
      className="
      min-h-screen
      grid
      lg:grid-cols-2
      bg-white
      "
    >


      {/* Sol Alan */}

      <section
        className="
        hidden
        lg:flex
        items-center
        justify-center
        px-12
        bg-neutral-950
        text-white
        "
      >

        <LoginHero />

      </section>







      {/* Sağ Alan */}

      <section
        className="
        flex
        items-center
        justify-center
        px-6
        py-10
        "
      >


        <div
          className="
          w-full
          max-w-md
          space-y-8
          "
        >


          <LoginHeader />



          <div
            className="
            rounded-3xl
            border
            border-gray-100
            bg-white
            p-8
            shadow-sm
            "
          >


            <LoginForm />


          </div>



          <DemoAccounts />



        </div>


      </section>



    </main>

  );

}