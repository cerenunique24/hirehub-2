"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardMascot } from "@/components/dashboard/DashboardMascot";
import { panelRootClass, PanelBadge, PanelAction } from "@/components/dashboard/PanelPrimitives";
import styles from "@/components/projects/MyProjects.module.css";
import {
  CalendarDays,
  ArrowRight,
  Loader2,
  AlertCircle,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string | null;
};

type TeamMembership = {
  id: string;
  project_id: string;
  role: string | null;
};

type MyProject = Project & {
  membership: TeamMembership;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Belirtilmedi";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

type ProjectTab = "all" | "active" | "waiting" | "completed";
const filters: { value: ProjectTab; label: string }[] = [{value:"all",label:"Tümü"},{value:"active",label:"Aktif"},{value:"waiting",label:"Başlangıç Bekleyen"},{value:"completed",label:"Tamamlanan"}];
function getStatusLabel(status: string | null) {
 switch(status) {
 case "in_progress": return "Çalışma devam ediyor";
 case "completed": return "Tamamlandı";
 case "cancelled": return "İptal edildi";
 case "paused": return "Duraklatıldı";
 case "ready_to_start": return "Ekip hazır · Başlamadı";
 default: return "Tanımsız";
 }
}
function nextStep(status: string | null) {
 switch(status) {
 case "in_progress": return "Çalışma alanında sıradaki aşamayı kontrol et.";
 case "ready_to_start": return "Proje başlangıcı bekleniyor";
 case "paused": return "Projenin devam etmesi bekleniyor";
 case "completed": return "Tamamlanan çalışmanı görüntüle.";
 case "cancelled": return "Proje iptal edildi.";
 default: return "Proje detaylarını incele.";
 }
}
function matchesTab(status: string | null, tab: ProjectTab) {
 return tab === "all" || (tab === "active" && status === "in_progress") || (tab === "waiting" && status === "ready_to_start") || (tab === "completed" && status === "completed");
}
export default function ProjectsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [projects, setProjects] = useState<MyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<ProjectTab>("all");

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("Projelerinizi görüntülemek için giriş yapmanız gerekiyor.");
          return;
        }

        // Gerçek ekip üyeliği project_team_members tablosundan okunur;
        // hem proposal hem de invitation ile katılanları kapsar.
        const { data: memberships, error: membershipsError } = await supabase
          .from("project_team_members")
          .select("id, project_id, role")
          .eq("freelancer_id", user.id)
          .eq("status", "active");

        if (membershipsError) {
          console.error("Ekip üyelikleri yüklenemedi:", membershipsError);
          setError("Projeler yüklenemedi. Lütfen tekrar deneyin.");
          return;
        }

        const teamMemberships = (memberships ?? []) as TeamMembership[];

        if (teamMemberships.length === 0) {
          setProjects([]);
          return;
        }

        const projectIds = teamMemberships.map((membership) => membership.project_id);

        const { data: projectData, error: projectsError } = await supabase
          .from("projects")
          .select("id, title, description, deadline, status")
          .in("id", projectIds);

        if (projectsError) {
          console.error("Projeler yüklenemedi:", projectsError);
          setError("Projeler yüklenemedi. Lütfen tekrar deneyin.");
          return;
        }

        const membershipByProjectId = new Map(
          teamMemberships.map((membership) => [membership.project_id, membership])
        );

        const myProjects: MyProject[] = (projectData ?? [])
          .map((project) => {
            const membership = membershipByProjectId.get(project.id);
            if (!membership) return null;
            return { ...(project as Project), membership };
          })
          .filter((project): project is MyProject => project !== null);

        setProjects(myProjects);
      } catch (loadException) {
        console.error("BEKLENMEYEN PROJE HATASI:", loadException);
        setError("Projeler yüklenirken beklenmeyen bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }

    void loadProjects();
  }, [supabase]);

  const visibleProjects = projects.filter(project => matchesTab(project.status, tab));
  const isEmpty = !error && projects.length === 0;

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 size={20} className="animate-spin" />
          Projeler yükleniyor...
        </div>
       <div className={styles.bottomAccent} aria-hidden="true"><DashboardMascot pose="laptop" size={130} className={styles.mascot} /></div>
   </main>
    );
  }

  return (
   <main className={[panelRootClass, styles.page].join(" ")}>
    <header className={styles.header}>
     <div className={styles.intro}>
      <h1>Projelerim</h1>
      <p>Aktif, bekleyen ve tamamlanan projelerini tek yerden takip et.</p>
     </div>
     <PanelAction href="/freelancers/discover">Projeleri Keşfet<ArrowRight size={16} /></PanelAction>
    </header>
    {error && <div className={styles.error} role="alert"><AlertCircle size={18} /><p>{error}</p></div>}
    {!error && <div className={styles.filters} role="group" aria-label="Proje durumuna göre filtrele">
     {filters.map(filter => <button key={filter.value} type="button" aria-pressed={tab === filter.value} onClick={() => setTab(filter.value)} className={tab === filter.value ? styles.selected : ""}>
      {filter.label}<span>{projects.filter(project => matchesTab(project.status, filter.value)).length}</span>
     </button>)}
    </div>}
    {!error && visibleProjects.length === 0 && <section className={styles.empty}>
     <h2>{isEmpty ? "Henüz aktif projen yok" : "Bu durumda bir projen yok"}</h2>
     <p>{isEmpty ? "Sana uygun projeleri keşfedebilir veya gelen davetleri inceleyebilirsin." : "Diğer durumları görmek için proje filtresini değiştirebilirsin."}</p>
     {isEmpty && <PanelAction href="/freelancers/discover" variant="primary">Projeleri keşfet</PanelAction>}
    </section>}
    <div className={styles.list}>
     {visibleProjects.map(project => {
      const workspace = project.status === "in_progress" || project.status === "completed";
      const href = workspace ? "/freelancers/projects/" + project.id : "/freelancers/discover/" + project.id;
      return <article key={project.id} className={styles.card}>
       <div className={styles.cardHeading}><h2>{project.title}</h2><PanelBadge>{getStatusLabel(project.status)}</PanelBadge></div>
       <p className={styles.description}>{project.description || "Proje açıklaması bulunmuyor."}</p>
       <dl className={styles.metadata}>
        <div><dt><Users size={16} />Projede rolün</dt><dd>{project.membership.role || "Belirtilmedi"}</dd></div>
        <div><dt><CalendarDays size={16} />Teslim tarihi</dt><dd>{formatDate(project.deadline)}</dd></div>
       </dl>
       <div className={styles.cardFooter}><div><span>Sıradaki adım</span><p>{nextStep(project.status)}</p></div>
        <PanelAction href={href} variant={project.status === "in_progress" ? "primary" : "secondary"}>
         {project.status === "in_progress" ? "Çalışma alanını aç" : project.status === "completed" ? "Projeyi görüntüle" : "Detayları gör"}<ArrowRight size={16} />
        </PanelAction>
       </div>
      </article>;
     })}
    </div>
    <div className={styles.bottomAccent} aria-hidden="true"><DashboardMascot pose="laptop" size={130} className={styles.mascot} /></div>
   </main>
  );
}
