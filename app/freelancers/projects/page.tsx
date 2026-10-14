"use client";

import { useEffect, useMemo, useState } from "react";
import {ProjectsListFrame} from "@/components/projects/ProjectsListFrame";
import {ProjectListCard} from "@/components/projects/ProjectListCard";
import {projectListTabs,projectMatchesTab,projectListAction,projectListContext,projectListDate,type ProjectsTab} from "@/components/projects/projectListPresentation";
import { PanelAction } from "@/components/dashboard/PanelPrimitives";
import {
  CalendarDays,
  ArrowRight,
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

type ProjectTab=ProjectsTab;
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

  const visibleProjects=projects.filter(project=>projectMatchesTab(project.status,tab));
  const isEmpty=!error&&projects.length===0;
  return <ProjectsListFrame title="Projelerim" description="Aktif, bekleyen ve tamamlanan projelerini tek yerden takip et." action={<PanelAction href="/freelancers/discover" variant="primary">Projeleri Keşfet<ArrowRight size={16}/></PanelAction>} tabs={projectListTabs(projects,"freelancer")} value={tab} onChange={value=>setTab(value as ProjectTab)} loading={loading} error={error} totalCount={projects.length} visibleCount={visibleProjects.length} emptyTitle={isEmpty?"Henüz bir projen yok":"Bu durumda bir projen yok"} emptyDescription={isEmpty?"Sana uygun projeleri keşfedebilir veya gelen davetleri inceleyebilirsin.":"Diğer durumları görmek için proje sekmesini değiştirebilirsin."} emptyAction={isEmpty?<PanelAction href="/freelancers/discover" variant="primary">Projeleri Keşfet</PanelAction>:undefined}>
    {visibleProjects.map(project=><ProjectListCard key={project.id} title={project.title} description={project.description} status={project.status} metadata={<><div><dt><Users size={16}/>Projede rolün</dt><dd>{project.membership.role||"Belirtilmedi"}</dd></div><div><dt><CalendarDays size={16}/>Teslim tarihi</dt><dd>{projectListDate(project.deadline)}</dd></div></>} context={projectListContext(project.status,"freelancer")} action={projectListAction(project.id,project.status,"freelancer")}/>)}
  </ProjectsListFrame>;
}
