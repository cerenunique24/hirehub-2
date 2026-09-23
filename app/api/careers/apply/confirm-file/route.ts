import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitKey, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";
import { CAREER_FILES_ALLOWED_MIME_TYPES, CAREER_FILES_MAX_TOTAL_BYTES } from "@/lib/careers";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/careers/apply/confirm-file — records file metadata after the
 * client has successfully uploaded the bytes directly to Storage via the
 * signed URL from /upload-url.
 *
 * Re-validates type/size here too (defense in depth — this is the row that
 * actually becomes visible to admins), and the `career_application_files`
 * table's own INSERT trigger re-checks the cumulative 3 GB cap as the final
 * authoritative backstop (covers races between concurrent uploads).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { ok: withinLimit } = await checkRateLimit(
      supabase,
      rateLimitKey("careers_confirm_file", getClientIp(request)),
      40,
      3600
    );

    if (!withinLimit) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";
    const path = typeof body.path === "string" ? body.path : "";
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const fileType = typeof body.fileType === "string" ? body.fileType : "";
    const fileSize = Number(body.fileSize);

    if (!UUID_PATTERN.test(applicationId)) {
      return NextResponse.json({ error: "Geçersiz başvuru." }, { status: 400 });
    }

    // The path must belong to this application's own folder — prevents a
    // client from attaching metadata that points at an unrelated object.
    if (!path.startsWith(`${applicationId}/`)) {
      return NextResponse.json({ error: "Geçersiz dosya yolu." }, { status: 400 });
    }

    if (!fileName || !Number.isFinite(fileSize) || fileSize <= 0 || fileSize > CAREER_FILES_MAX_TOTAL_BYTES) {
      return NextResponse.json({ error: "Geçersiz dosya bilgisi." }, { status: 400 });
    }

    if (!CAREER_FILES_ALLOWED_MIME_TYPES.includes(fileType as (typeof CAREER_FILES_ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json({ error: "Desteklenmeyen dosya formatı." }, { status: 400 });
    }

    const { error } = await supabase.from("career_application_files").insert({
      application_id: applicationId,
      file_name: fileName.slice(0, 255),
      file_path: path,
      file_size: fileSize,
      file_type: fileType,
    });

    if (error) {
      // Most likely the 3 GB-cumulative trigger firing on a race, or the
      // application id no longer existing.
      console.error("[Careers] confirm-file insert error:", error);
      return NextResponse.json(
        { error: error.message.includes("3 GB") ? error.message : "Dosya kaydedilemedi." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Careers] unexpected error:", error);
    return NextResponse.json({ error: "Dosya kaydedilemedi." }, { status: 500 });
  }
}
