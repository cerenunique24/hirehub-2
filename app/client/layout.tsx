import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import PageContainer from "@/components/layout/PageContainer";


export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <div className="flex min-h-screen bg-[#f8f8f8]">


      <Sidebar />


      <div className="flex min-w-0 flex-1 flex-col">


        <Navbar />


        <main className="panel-main min-w-0 flex-1 overflow-x-hidden">
          <PageContainer>{children}</PageContainer>
        </main>


      </div>


    </div>

  );

}
