import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitKey, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";
import { CAREER_FILES_ALLOWED_MIME_TYPES, CAREER_FILES_MAX_TOTAL_BYTES } from "@/lib/careers";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "dosya";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150) || "dosya";
}

/**
 * POST /api/careers/apply/upload-url — issues a Supabase Storage signed
 * upload URL for one CV/portfolio file.
 *
 * Large files (up to 3 GB) must never pass through a Next.js/Vercel
 * serverless function body — the client uploads the bytes directly to
 * Storage using the signed URL this route returns. This route only:
 *  1. validates the declared type/size against the real allowlist/cap,
 *  2. checks the running total already uploaded for this application
 *     (via the `career_application_uploaded_bytes` RPC) so a request that
 *     would blow the 3 GB cumulative cap is rejected before a slot is even
 *     issued,
 *  3. asks Storage for a signed upload URL scoped to this application's own
 *     folder — Storage's own RLS policy (`career_application_exists`)
 *     re-validates the application id independently.
 *
 * The DB trigger on `career_application_files` is the final, authoritative
 * backstop once the client calls /confirm-file after the bytes land.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { ok: withinLimit } = await checkRateLimit(
      supabase,
      rateLimitKey("careers_upload_url", getClientIp(request)),
      40,
      3600
    );

    if (!withinLimit) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const fileType = typeof body.fileType === "string" ? body.fileType : "";
    const fileSize = Number(body.fileSize);

    if (!UUID_PATTERN.test(applicationId)) {
      return NextResponse.json({ error: "Geçersiz başvuru." }, { status: 400 });
    }

    if (!fileName) {
      return NextResponse.json({ error: "Dosya adı eksik." }, { status: 400 });
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "Geçersiz dosya boyutu." }, { status: 400 });
    }

    if (fileSize > CAREER_FILES_MAX_TOTAL_BYTES) {
      return NextResponse.json({ error: "Dosya 3 GB sınırını aşıyor." }, { status: 400 });
    }

    if (!CAREER_FILES_ALLOWED_MIME_TYPES.includes(fileType as (typeof CAREER_FILES_ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json(
        { error: "Desteklenmeyen dosya formatı. PDF, DOC, DOCX, ZIP, JPG veya PNG yükleyebilirsin." },
        { status: 400 }
      );
    }

    const { data: uploadedBytes, error: totalError } = await supabase.rpc("career_application_uploaded_bytes", {
      p_application_id: applicationId,
    });

    if (totalError) {
      console.error("[Careers] uploaded-bytes RPC error:", totalError);
      return NextResponse.json({ error: "Dosya yüklenemedi." }, { status: 500 });
    }

    const currentTotal = Number(uploadedBytes) || 0;

    if (currentTotal + fileSize > CAREER_FILES_MAX_TOTAL_BYTES) {
      return NextResponse.json(
        { error: "Bu başvuru için toplam dosya boyutu 3 GB sınırını aşıyor." },
        { status: 400 }
      );
    }

    const path = `${applicationId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;

    const { data: signed, error: signError } = await supabase.storage
      .from("career-applications")
      .createSignedUploadUrl(path);

    if (signError || !signed) {
      console.error("[Careers] createSignedUploadUrl error:", signError);
      return NextResponse.json({ error: "Yükleme bağlantısı oluşturulamadı." }, { status: 400 });
    }

    return NextResponse.json({ path: signed.path, token: signed.token });
  } catch (error) {
    console.error("[Careers] unexpected error:", error);
    return NextResponse.json({ error: "Yükleme bağlantısı oluşturulamadı." }, { status: 500 });
  }
}
