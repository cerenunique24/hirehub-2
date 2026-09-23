import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitKey, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";
import { isValidCareerEmail } from "@/lib/careers";

const MAX_TEXT_LENGTH = {
  firstName: 80,
  lastName: 80,
  email: 254,
  expertise: 120,
  introduction: 4000,
};

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * POST /api/careers/apply — creates the `career_applications` row.
 *
 * Public, unauthenticated endpoint (CollaCrew team applications, not
 * freelancer signup). Rate-limited by IP since there is no user identity to
 * key on. File attachments are handled separately (see upload-url /
 * confirm-file) once this returns an `applicationId`.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { ok: withinLimit } = await checkRateLimit(
      supabase,
      rateLimitKey("careers_apply", getClientIp(request)),
      5,
      3600
    );

    if (!withinLimit) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));

    const firstName = trimmed(body.firstName);
    const lastName = trimmed(body.lastName);
    const email = trimmed(body.email).toLowerCase();
    const expertise = trimmed(body.expertise);
    const introduction = trimmed(body.introduction);

    if (!firstName || !lastName || !email || !expertise || !introduction) {
      return NextResponse.json({ error: "Lütfen tüm alanları doldurun." }, { status: 400 });
    }

    if (
      firstName.length > MAX_TEXT_LENGTH.firstName ||
      lastName.length > MAX_TEXT_LENGTH.lastName ||
      email.length > MAX_TEXT_LENGTH.email ||
      expertise.length > MAX_TEXT_LENGTH.expertise ||
      introduction.length > MAX_TEXT_LENGTH.introduction
    ) {
      return NextResponse.json({ error: "Girdiğin bilgilerden biri çok uzun." }, { status: 400 });
    }

    if (!isValidCareerEmail(email)) {
      return NextResponse.json({ error: "Geçerli bir e-posta adresi gir." }, { status: 400 });
    }

    /*
     * `anon` can INSERT (RLS) but has no SELECT policy on this table (only
     * admins can read applications back — that's intentional PII
     * protection). That means `.insert().select()` would fail: Postgres
     * RLS treats `INSERT ... RETURNING` as also requiring the new row to
     * pass a SELECT policy. Generating the id here and inserting it
     * explicitly avoids ever needing to read the row back.
     */
    const applicationId = crypto.randomUUID();

    const { error } = await supabase.from("career_applications").insert({
      id: applicationId,
      first_name: firstName,
      last_name: lastName,
      email,
      expertise,
      introduction,
    });

    if (error) {
      console.error("[Careers] application insert error:", error);
      return NextResponse.json({ error: "Başvuru gönderilirken bir hata oluştu." }, { status: 500 });
    }

    return NextResponse.json({ applicationId });
  } catch (error) {
    console.error("[Careers] unexpected error:", error);
    return NextResponse.json({ error: "Başvuru gönderilirken bir hata oluştu." }, { status: 500 });
  }
}
