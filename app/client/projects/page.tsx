"use client";
import {useEffect,useMemo,useState} from "react";
import {ArrowRight,CalendarDays,Users} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
import {formatCurrency} from "@/lib/utils/formatCurrency";
import {PanelAction} from "@/components/dashboard/PanelPrimitives";
import {ProjectsListFrame} from "@/components/projects/ProjectsListFrame";
import {ProjectListCard} from "@/components/projects/ProjectListCard";
import {projectListTabs,projectMatchesTab,projectListAction,projectListContext,projectListDate,type ProjectsTab} from "@/components/projects/projectListPresentation";
type Project = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  budget: number | null;
  budget_max: number | null;
  skills: string[] | null;
  created_at: string;
  deadline:string|null;
  project_type:string|null;
  team_required:boolean|null;
};
type Tab=ProjectsTab;
export default function ClientProjectsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    async function loadProjects() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Projelerinizi görüntülemek için giriş yapmanız gerekiyor.");
        setLoading(false);
        return;
      }
      const { data, error: loadError } = await supabase
        .from("projects")
        .select("id, title, description, status, budget, budget_max, skills, created_at, deadline, project_type, team_required")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });
      if (loadError) setError("Projeleriniz yüklenemedi.");
      else setProjects((data ?? []) as Project[]);
      setLoading(false);
    }
    void loadProjects();
  }, [supabase]);


  const visibleProjects=projects.filter(project=>projectMatchesTab(project.status,tab));
  const emptyCopy:Record<Tab,{title:string;body:string}>={all:{title:"Henüz bir projen yok",body:"İlk projenizi oluşturarak yeteneklerle eşleşmeye başlayabilirsiniz."},draft:{title:"Taslak proje yok",body:"Kaydedilmiş taslak projeler burada görünür."},open:{title:"Yayında bir proje yok",body:"Yeni bir proje yayınlayarak freelancer teklifleri almaya başlayabilirsin."},waiting:{title:"Başlangıç bekleyen proje yok",body:"Ekibi hazır, henüz başlamamış projeler burada görünür."},active:{title:"Henüz aktif bir projen yok",body:"Bir proje başlatıldığında burada görünecek."},completed:{title:"Henüz tamamlanan bir projen yok",body:"Bir proje tamamlandığında burada görünecek."}};
  return <ProjectsListFrame title="Projeler" description="Yayındaki, başlangıç bekleyen ve devam eden projelerini yönet." action={<PanelAction href="/client/projects/new" variant="primary">Yeni Proje Oluştur<ArrowRight size={16}/></PanelAction>} tabs={projectListTabs(projects,"client")} value={tab} onChange={value=>setTab(value as Tab)} loading={loading} error={error} totalCount={projects.length} visibleCount={visibleProjects.length} emptyTitle={emptyCopy[tab].title} emptyDescription={emptyCopy[tab].body} emptyAction={projects.length===0?<PanelAction href="/client/projects/new" variant="primary">Yeni Proje Oluştur</PanelAction>:undefined}>
    {visibleProjects.map(project=>{const raw=project.budget_max??project.budget;const budget=raw==null?null:Number(raw);return <ProjectListCard key={project.id} title={project.title} description={project.description} status={project.status} context={projectListContext(project.status,"client")} action={projectListAction(project.id,project.status,"client")} metadata={<><div><dt>Bütçe</dt><dd>{budget==null||!Number.isFinite(budget)?"Belirtilmedi":formatCurrency(budget)}</dd></div>{project.project_type&&<div><dt>Proje tipi</dt><dd>{project.project_type}</dd></div>}{typeof project.team_required==="boolean"&&<div><dt><Users size={16}/>Çalışma modeli</dt><dd>{project.team_required?"Ekip projesi":"Bireysel proje"}</dd></div>}{project.deadline&&<div><dt><CalendarDays size={16}/>Teslim tarihi</dt><dd>{projectListDate(project.deadline)}</dd></div>}{project.skills&&project.skills.length>0&&<div><dt>Gerekli yetenekler</dt><dd>{project.skills.slice(0,3).join(" · ")}{project.skills.length>3?" · +"+(project.skills.length-3):""}</dd></div>}</>}/>;})}
  </ProjectsListFrame>;
}
