import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

export default function FreelancersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface">

      <aside className="w-64 shrink-0">
        <Sidebar />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">

        <Header />

        <main className="flex-1 p-6 overflow-x-hidden">
          {children}
        </main>

      </div>

    </div>
  );
}