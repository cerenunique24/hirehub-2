import type { TeamCompletion } from "@/lib/projects/teamReadiness";

/** Client perspective from existing project/role state; no personal task is inferred. */
export function clientCoalitionNextStep(project: { status: string } | null, team: TeamCompletion | null) {
  if (!project) return "Proje bilgileri doğrulanamadı";
  switch (project.status) {
    case "in_progress": return "Çalışma devam ediyor";
    case "completed": return "Proje tamamlandı";
    case "paused": return "Proje duraklatıldı";
    case "cancelled": return "Proje iptal edildi";
    case "ready_to_start": return "Ekip hazır · Başlatma adımını ekip alanından kontrol et";
    case "open":
      if (!team) return "Rol kontenjanı doğrulanamadı";
      if (team.ready) return "Tüm roller dolu";
      return team.isTeamProject ? team.roles.filter(role => !role.isFull).length + " rol için ekip üyesi gerekiyor" : "Ekip üyesi gerekiyor";
    default: return "Proje durumunu ekip alanından kontrol et";
  }
}
export function coalitionUpdatedDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Belirtilmedi";
  return new Date(value).toLocaleDateString("tr-TR", {day:"numeric",month:"long",year:"numeric"});
}
