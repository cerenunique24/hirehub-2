"use client";

import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  File,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  UploadCloud,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { notifyUsers } from "@/lib/notifications";

type ProjectFile = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  url?: string;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * `project-files` Storage bucket'ının GERÇEKTEN kabul ettiği MIME
 * listesiyle birebir aynı olmalı (bkz. Supabase bucket ayarları —
 * allowed_mime_types). Önceden frontend SVG/GIF/HEIC'i de "resim"
 * sayıyordu ama bucket bunları kabul etmiyordu; dosya sessizce/anlaşılmaz
 * bir hatayla reddediliyordu. Artık yükleme ÖNCESİNDE burada kontrol
 * edilip açık bir Türkçe mesaj gösteriliyor.
 */
const SUPPORTED_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const SUPPORTED_FILE_FORMATS_LABEL =
  "PDF, PNG, JPG, WEBP, ZIP, MP4, Word, Excel, PowerPoint";

export default function ProjectFiles({
  projectId,
  canManage,
  milestoneId,
}: {
  projectId: string;
  canManage: boolean;
  /**
   * Verilirse dosyalar yalnızca bu aşamaya bağlı olanlarla sınırlanır.
   */
  milestoneId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Signed URL süresi dolmuş/geçici bir ağ hatası varsa <img> kırık
  // resim ikonu göstermek yerine genel dosya ikonuna düşülür.
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(
    new Set(),
  );

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");

    let query = supabase
      .from("project_files")
      .select(
        "id, file_name, file_path, file_type, file_size, milestone_id",
      )
      .eq("project_id", projectId);

    query = milestoneId
      ? query.eq("milestone_id", milestoneId)
      : query.is("milestone_id", null);

    const { data, error: loadError } = await query.order("created_at", {
      ascending: false,
    });

    if (loadError) {
      console.error(
        "Proje dosyaları yüklenemedi:",
        formatSupabaseError(loadError),
      );

      setError("Proje dosyaları yüklenemedi.");
      setFiles([]);
      setLoading(false);
      return;
    }

    const items = (data ?? []) as ProjectFile[];

    // Dosya sayısı kadar ayrı ayrı createSignedUrl round trip'i yerine
    // tek bir batch çağrısı (aynı sonuç, N istek yerine 1 istek).
    let signedByPath = new Map<string, string>();

    if (items.length > 0) {
      const { data: signedList, error: signedError } = await supabase.storage
        .from("project-files")
        .createSignedUrls(
          items.map((item) => item.file_path),
          60 * 60,
        );

      if (signedError) {
        console.error(
          "Dosyalar için signed URL oluşturulamadı:",
          formatSupabaseError(signedError),
        );
      }

      signedByPath = new Map(
        (signedList ?? [])
          .filter((entry) => !entry.error && entry.signedUrl)
          .map((entry) => [entry.path ?? "", entry.signedUrl as string]),
      );
    }

    const filesWithUrls = items.map((item) => ({
      ...item,
      url: signedByPath.get(item.file_path),
    }));

    setFiles(filesWithUrls);
    setLoading(false);
  }, [projectId, milestoneId, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFiles();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadFiles]);

  async function uploadFiles(selected: FileList | File[]) {
    if (!canManage || uploading) return;

    const candidates = Array.from(selected);

    if (candidates.length === 0) return;

    const tooLarge = candidates.find((file) => file.size > MAX_FILE_SIZE);

    if (tooLarge) {
      setError(
        `"${tooLarge.name}" dosyası 25 MB sınırını aşıyor.`,
      );
      return;
    }

    const unsupported = candidates.find(
      (file) => !SUPPORTED_UPLOAD_MIME_TYPES.has(file.type || guessMimeTypeFromName(file.name))
    );

    if (unsupported) {
      setError(
        `"${unsupported.name}" desteklenmeyen bir dosya türü. Desteklenen türler: ${SUPPORTED_FILE_FORMATS_LABEL}.`,
      );
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Kullanıcı bilgisi alınamadı:",
          formatSupabaseError(userError),
        );

        setError("Oturum bilgileri alınamadı.");
        return;
      }

      if (!user) {
        setError("Dosya eklemek için giriş yapmanız gerekiyor.");
        return;
      }

      let uploadedCount = 0;

      for (const file of candidates) {
        const safeName = file.name
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .replace(/_+/g, "_");

        const filePath = `${user.id}/${projectId}/${crypto.randomUUID()}-${safeName}`;

        // Bazı tarayıcı/OS kombinasyonlarında (özellikle sürükle-bırak ile
        // eklenen bazı görsel formatlarında) `file.type` boş gelebiliyor.
        // Doğrudan "application/octet-stream"e düşmek, gerçek bir görseli
        // kalıcı olarak "resim değil" gibi kaydedip küçük önizlemeyi hep
        // devre dışı bırakıyordu — önce uzantıdan tahmin ediliyor.
        const contentType = file.type || guessMimeTypeFromName(file.name);

        const { error: storageError } = await supabase.storage
          .from("project-files")
          .upload(filePath, file, {
            contentType,
            upsert: false,
          });

        if (storageError) {
          console.error(
            "Dosya Storage'a yüklenemedi:",
            formatSupabaseError(storageError),
          );

          setError(
            `"${file.name}" ${describeUploadError(storageError)}`,
          );

          continue;
        }

        const { error: metadataError } = await supabase
          .from("project_files")
          .insert({
            project_id: projectId,
            milestone_id: milestoneId ?? null,
            file_name: file.name,
            file_path: filePath,
            file_type: contentType,
            file_size: file.size,
          });

        if (metadataError) {
          console.error(
            "Dosya kaydı oluşturulamadı:",
            formatSupabaseError(metadataError),
          );

          // DB metadata kaydı başarısız olduysa Storage'daki
          // dosyayı temizlemeyi deniyoruz.
          const { error: rollbackError } = await supabase.storage
            .from("project-files")
            .remove([filePath]);

          if (rollbackError) {
            console.error(
              "Storage rollback başarısız:",
              formatSupabaseError(rollbackError),
            );
          }

          setError(
            `"${file.name}" için dosya bilgileri kaydedilemedi.`,
          );

          continue;
        }

        uploadedCount += 1;
      }

      await loadFiles();

      if (uploadedCount > 0) {
        setSuccess(
          uploadedCount === 1
            ? "1 dosya başarıyla eklendi."
            : `${uploadedCount} dosya başarıyla eklendi.`,
        );

        /*
         * Bir aşamaya (milestoneId) bağlı dosya yüklemesi, teslim
         * KOMPOZİSYONUNUN bir parçasıdır — ayrı bir "dosya eklendi"
         * bildirimi göndermez. Aksi halde 7 dosyalı bir teslimde, her
         * dosya için bir bildirim + "Teslim Et" bildirimi = 8 ayrı
         * bildirim oluşuyordu (bkz. notifyDeliverySubmitted,
         * ProjectWorkroom.tsx::handleSubmitDelivery — asıl business
         * event budur). Sadece proje genel "Dosyalar" sekmesine
         * (milestoneId yok) eklenen dosyalar kendi bildirimini üretir.
         */
        if (!milestoneId) {
          // Yükleyen client'ın kendisi değilse (yani bir takım üyesi
          // dosya eklediyse) projenin client'ına bildirim gönder.
          // Client kendi dosyasını yüklerken bildirim gitmez.
          const { data: projectRow } = await supabase
            .from("projects")
            .select("client_id, title")
            .eq("id", projectId)
            .maybeSingle();

          if (projectRow && projectRow.client_id !== user.id) {
            await notifyUsers(supabase, [
              {
                userId: projectRow.client_id,
                type: "project_file_uploaded",
                title: "Yeni dosya eklendi",
                message: `"${projectRow.title}" projesine yeni bir dosya eklendi.`,
                link: `/client/projects/${projectId}`,
              },
            ]);
          }
        }
      }
    } catch (uploadError) {
      console.error(
        "Dosya yükleme sırasında beklenmeyen hata:",
        formatSupabaseError(uploadError),
      );

      setError("Dosya yüklenirken beklenmeyen bir sorun oluştu.");
    } finally {
      setUploading(false);
    }
  }

  async function removeFile(file: ProjectFile) {
    if (
      !canManage ||
      !window.confirm(
        `"${file.file_name}" dosyasını silmek istediğinizden emin misiniz?`,
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");

    const { error: metadataError } = await supabase
      .from("project_files")
      .delete()
      .eq("id", file.id);

    if (metadataError) {
      console.error(
        "Dosya kaydı silinemedi:",
        formatSupabaseError(metadataError),
      );

      setError("Dosya silinemedi.");
      return;
    }

    const { error: storageError } = await supabase.storage
      .from("project-files")
      .remove([file.file_path]);

    if (storageError) {
      console.error(
        "Storage dosyası silinemedi:",
        formatSupabaseError(storageError),
      );

      setError(
        "Dosya kaydı silindi, ancak depolama dosyası kaldı.",
      );
    } else {
      setSuccess("Dosya silindi.");
    }

    await loadFiles();
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      void uploadFiles(event.target.files);
    }

    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();

    if (!canManage || uploading) return;

    void uploadFiles(event.dataTransfer.files);
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Proje dosyaları
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Brief, görsel ve destekleyici dokümanları burada
            görüntüleyin.
          </p>
        </div>

        <Paperclip size={20} className="text-gray-400" />
      </div>

      {canManage && (
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-7 text-center transition hover:border-gray-500 hover:bg-gray-100"
        >
          {uploading ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <UploadCloud size={22} />
          )}

          <span className="mt-2 text-sm font-medium text-gray-800">
            Dosyaları buraya bırakın veya seçin
          </span>

          <span className="mt-1 text-xs text-gray-500">
            Görsel, PDF, Word ve diğer dosyalar · en fazla 25 MB
          </span>

          <input
            type="file"
            multiple
            className="sr-only"
            onChange={onInputChange}
            disabled={uploading}
          />
        </label>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {success && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      )}

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          Dosyalar yükleniyor...
        </div>
      ) : files.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">
          Henüz dosya eklenmedi.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-100 p-3"
            >
              {file.file_type.startsWith("image/") &&
              file.url &&
              !brokenImageIds.has(file.id) ? (
                <img
                  src={file.url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  onError={() =>
                    setBrokenImageIds((current) => {
                      const next = new Set(current);
                      next.add(file.id);
                      return next;
                    })
                  }
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  {file.file_type === "application/pdf" ? (
                    <FileText size={20} />
                  ) : (
                    <File size={20} />
                  )}
                </div>
              )}

              <a
                href={file.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className={`min-w-0 flex-1 ${
                  file.url
                    ? "cursor-pointer"
                    : "pointer-events-none cursor-default"
                }`}
              >
                <p className="truncate text-sm font-medium text-gray-900">
                  {file.file_name}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {formatFileSize(file.file_size)}
                </p>
              </a>

              {canManage && (
                <button
                  type="button"
                  onClick={() => void removeFile(file)}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label={`${file.file_name} dosyasını sil`}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const EXTENSION_MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  heic: "image/heic",
  pdf: "application/pdf",
};

function guessMimeTypeFromName(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME_TYPES[extension] ?? "application/octet-stream";
}

function describeUploadError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null
        ? String((error as { message?: unknown }).message ?? "")
        : "";

  if (/row-level security|permission denied/i.test(message)) {
    return "için dosya yükleme yetkiniz bulunmuyor.";
  }

  // Supabase Storage, bucket'ın allowed_mime_types listesine girmeyen bir
  // dosya türünü bu mesajla reddeder. Önceden burada jenerik "yüklenemedi"
  // gösteriliyordu — kullanıcı SVG/GIF/HEIC gibi arayüzün desteklediğini
  // sandığı ama storage'ın kabul etmediği bir türü tekrar tekrar
  // denemeye çalışıyordu. Bkz. ALLOWED_FILE_LABEL.
  if (/mime type.*not supported|not allowed/i.test(message)) {
    return `için desteklenmeyen bir dosya türü seçtiniz. Desteklenen türler: ${SUPPORTED_FILE_FORMATS_LABEL}.`;
  }

  return "yüklenemedi. Lütfen tekrar deneyin.";
}

function formatSupabaseError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    const value = error as Record<string, unknown>;

    return {
      name: value.name,
      message: value.message,
      details: value.details,
      hint: value.hint,
      code: value.code,
      status: value.status,
      statusCode: value.statusCode,
    };
  }

  return {
    message: String(error),
  };
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
