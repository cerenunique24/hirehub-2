import Sidebar from "./components/Sidebar";
import DashboardNavbar from "./components/DashboardNavbar";

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

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-x-hidden p-6">
          <DashboardNavbar />

          {children}
        </main>
      </div>
    </div>
  );
}