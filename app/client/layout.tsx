import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";


export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <div className="flex min-h-screen bg-[#f8f8f8]">


      <Sidebar />


      <div className="flex-1">


        <Navbar />


        <main>
          {children}
        </main>


      </div>


    </div>

  );

}