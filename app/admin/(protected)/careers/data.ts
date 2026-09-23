import type { SupabaseClient } from "@supabase/supabase-js";

import type { CareerApplicationStatus } from "@/lib/careers";

export type AdminCareerApplicationListItem = {
  id: string;
  fullName: string;
  email: string;
  expertise: string;
  status: CareerApplicationStatus;
  createdAt: string;
  fileCount: number;
};

export type AdminCareerApplicationFile = {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
  /** Time-limited download link, generated server-side (admin-only Storage SELECT policy). */
  signedUrl: string | null;
};

export type AdminCareerApplicationDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  expertise: string;
  introduction: string;
  status: CareerApplicationStatus;
  createdAt: string;
  files: AdminCareerApplicationFile[];
};

export async function listCareerApplications(
  supabase: SupabaseClient
): Promise<{ items: AdminCareerApplicationListItem[]; error: boolean }> {
  const { data, error } = await supabase
    .from("career_applications")
    .select("id, first_name, last_name, email, expertise, status, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[CollaCrew Admin] Kariyer başvuruları alınamadı:", error);
    return { items: [], error: true };
  }

  const ids = data.map((row) => row.id);
  let fileCountByApplication = new Map<string, number>();

  if (ids.length > 0) {
    const { data: fileRows, error: fileError } = await supabase
      .from("career_application_files")
      .select("application_id")
      .in("application_id", ids);

    if (fileError) {
      console.error("[CollaCrew Admin] Başvuru dosya sayıları alınamadı:", fileError);
    } else {
      fileCountByApplication = new Map();
      for (const row of fileRows ?? []) {
        fileCountByApplication.set(row.application_id, (fileCountByApplication.get(row.application_id) ?? 0) + 1);
      }
    }
  }

  return {
    items: data.map((row) => ({
      id: row.id,
      fullName: `${row.first_name} ${row.last_name}`.trim(),
      email: row.email,
      expertise: row.expertise,
      status: row.status as CareerApplicationStatus,
      createdAt: row.created_at,
      fileCount: fileCountByApplication.get(row.id) ?? 0,
    })),
    error: false,
  };
}

export async function getAdminCareerApplicationDetail(
  supabase: SupabaseClient,
  id: string
): Promise<AdminCareerApplicationDetail | null> {
  const { data, error } = await supabase
    .from("career_applications")
    .select("id, first_name, last_name, email, expertise, introduction, status, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[CollaCrew Admin] Başvuru detayı alınamadı:", error);
    return null;
  }

  const { data: fileRows, error: fileError } = await supabase
    .from("career_application_files")
    .select("id, file_name, file_path, file_size, file_type, created_at")
    .eq("application_id", id)
    .order("created_at", { ascending: true });

  if (fileError) {
    console.error("[CollaCrew Admin] Başvuru dosyaları alınamadı:", fileError);
  }

  const files: AdminCareerApplicationFile[] = [];

  for (const row of fileRows ?? []) {
    const { data: signed, error: signError } = await supabase.storage
      .from("career-applications")
      .createSignedUrl(row.file_path, 60 * 10); // 10 dakika

    if (signError) {
      console.error("[CollaCrew Admin] İmzalı indirme bağlantısı oluşturulamadı:", signError);
    }

    files.push({
      id: row.id,
      fileName: row.file_name,
      fileSize: row.file_size,
      fileType: row.file_type,
      createdAt: row.created_at,
      signedUrl: signed?.signedUrl ?? null,
    });
  }

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    expertise: data.expertise,
    introduction: data.introduction,
    status: data.status as CareerApplicationStatus,
    createdAt: data.created_at,
    files,
  };
}
