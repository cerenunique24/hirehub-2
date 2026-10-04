import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mesaj eki yükleme — hem client hem freelancer mesajlaşma sayfaları aynı
 * fonksiyonu kullanır. Depolama: `message-attachments` bucket'ı, yol
 * `<auth.uid()>/<uuid>-<dosya adı>` (bkz. supabase/migrations/
 * 202609300016_message_attachments.sql). Sadece göndericinin kendi
 * klasörüne yazması + mesajın gerçek alıcısının okuyabilmesi DB seviyesinde
 * zorunlu kılınır; burası sadece istemci tarafı ön doğrulamadır.
 */
export const MESSAGE_ATTACHMENT_BUCKET = "message-attachments";

export const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export const ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.docx";

export function validateAttachment(file: File): string | null {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return "Desteklenmeyen dosya türü. JPG, PNG, WEBP, PDF veya DOCX yükleyebilirsin.";
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return "Dosya 10 MB'dan büyük olamaz.";
  }
  return null;
}

export type UploadedAttachment = {
  url: string;
  name: string;
  type: string;
};

/**
 * Dosyayı yükler ve mesaj satırına yazılacak alanları döner. Mesaj
 * gönderimi başarısız olursa çağıran taraf `deleteAttachment` ile
 * yüklenen dosyayı geri alabilir (orphan bırakmamak için).
 */
export async function uploadMessageAttachment(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ data: UploadedAttachment | null; error: string | null }> {
  const validationError = validateAttachment(file);
  if (validationError) {
    return { data: null, error: validationError };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage.from(MESSAGE_ATTACHMENT_BUCKET).upload(path, file, {
    contentType: file.type,
  });

  if (error) {
    return { data: null, error: "Dosya yüklenemedi. Lütfen tekrar dene." };
  }

  return { data: { url: path, name: file.name, type: file.type }, error: null };
}

export async function deleteMessageAttachment(supabase: SupabaseClient, path: string) {
  await supabase.storage.from(MESSAGE_ATTACHMENT_BUCKET).remove([path]);
}

export function isImageAttachment(type: string | null | undefined): boolean {
  return Boolean(type?.startsWith("image/"));
}
