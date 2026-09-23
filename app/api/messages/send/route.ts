import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { canUseFeature, getUserAccessContext } from "@/lib/premium";
import { containsContactInfo, CONTACT_INFO_MESSAGE } from "@/lib/moderation/contactInfoFilter";
import { checkRateLimit, rateLimitKey, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";

/**
 * POST /api/messages/send
 *
 * Genel freelancer → client mesaj gönderme endpoint'i
 * (`app/freelancers/messages/page.tsx` tarafından kullanılır).
 *
 * GÜVENLİK — bu route eklenmeden önce `app/freelancers/messages/page.tsx`
 * doğrudan `supabase.from("messages").insert(...)` çağırıyordu.
 * `messages` tablosunun INSERT RLS politikası sadece `sender_id =
 * auth.uid()` kontrol eder — proposal ilişkisi veya plan/entitlement
 * kontrolü YOKTUR. Sayfa, `receiver_id`/`proposal_id` değerlerini
 * URL query paramlarından (`?user=`, `?proposal=`) alıp doğrudan bu
 * insert'e veriyordu — herhangi bir freelancer, herhangi bir client
 * ID'sini query param'a yazarak, hiç teklif göndermeden ve plana
 * bakılmaksızın mesaj gönderebiliyordu (teklif öncesi mesajlaşma
 * kısıtlamasının tam bir bypass'ı).
 *
 * Bu route şunu garanti eder:
 * 1. `sender_id` HER ZAMAN authenticated kullanıcının kendi id'sidir
 *    (request body'den asla okunmaz).
 * 2. `proposalId` verilmişse: bu proposal gerçekten bu freelancer'a
 *    ait olmalı VE proposal'ın bağlı olduğu projenin client'ı
 *    `receiverId` ile eşleşmeli — teklif SONRASI mesajlaşma bu
 *    şekilde her zaman (herhangi bir plan'da) serbesttir.
 * 3. `proposalId` verilmemişse (teklif ÖNCESİ / proje bağlamı
 *    olmayan genel konuşma): `canUseFeature(context,
 *    "pre_proposal_messaging")` (Pro) ile AYNI merkezi entitlement
 *    kontrolü kullanılır — `/api/messages/pre-proposal/route.ts` ile
 *    birebir aynı feature key, tekrar yazılmadı.
 * 4. `receiverId` her koşulda gerçek bir `role = 'client'` profiline
 *    ait olmalı — sadece URL/body'den gelen ID'ye güvenilmez, DB'den
 *    doğrulanır.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      receiverId?: string;
      proposalId?: string | null;
      content?: string;
    };

    const receiverId = body.receiverId;
    const proposalId = body.proposalId || null;
    const content = (body.content ?? "").trim();

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: "Alıcı ve mesaj metni zorunludur." },
        { status: 400 }
      );
    }

    if (containsContactInfo(content)) {
      return NextResponse.json({ error: CONTACT_INFO_MESSAGE }, { status: 400 });
    }

    const supabase = await createClient();
    const context = await getUserAccessContext(supabase);

    if (!context.userId) {
      return NextResponse.json(
        { error: "Mesaj göndermek için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    if (context.role !== "freelancer") {
      return NextResponse.json(
        { error: "Bu özellik yalnızca freelancer hesapları için kullanılabilir." },
        { status: 403 }
      );
    }

    const senderId = context.userId;

    const { ok: withinLimit } = await checkRateLimit(
      supabase,
      rateLimitKey("messages_send", senderId),
      30,
      300
    );

    if (!withinLimit) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    // Alıcı gerçekten bir client profili mi? — ID'ye körü körüne güvenilmez.
    const { data: receiverProfile, error: receiverError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", receiverId)
      .eq("role", "client")
      .maybeSingle();

    if (receiverError || !receiverProfile) {
      return NextResponse.json(
        { error: "Alıcı bulunamadı." },
        { status: 404 }
      );
    }

    if (proposalId) {
      /*
       * TEKLİF SONRASI MESAJLAŞMA — her plan için serbest, ama
       * proposal gerçekten bu freelancer'a ait olmalı ve receiver
       * o proposal'ın projesinin client'ı olmalı. Aksi halde bir
       * freelancer, sahip olmadığı/alakasız bir proposal ID'sini
       * göndererek receiver ile ilgisiz bir konuşmaya mesaj
       * "yapıştıramaz".
       */
      const { data: proposal, error: proposalError } = await supabase
        .from("proposals")
        .select("id, freelancer_id, project_id")
        .eq("id", proposalId)
        .maybeSingle();

      if (proposalError || !proposal || proposal.freelancer_id !== senderId) {
        return NextResponse.json(
          { error: "Bu teklif üzerinden mesaj gönderme yetkin yok." },
          { status: 403 }
        );
      }

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, client_id")
        .eq("id", proposal.project_id)
        .maybeSingle();

      if (projectError || !project || project.client_id !== receiverId) {
        return NextResponse.json(
          { error: "Bu teklif seçilen alıcıyla ilişkili değil." },
          { status: 403 }
        );
      }
    } else {
      /*
       * TEKLİF ÖNCESİ / PROJE BAĞLAMI OLMAYAN MESAJ — sadece Pro
       * entitlement'ı ile izinli. Bu, /api/messages/pre-proposal
       * route'unun kullandığı AYNI feature key'dir — kural burada
       * tekrar yazılmıyor, merkezi `canUseFeature`'a devrediliyor.
       */
      if (!canUseFeature(context, "pre_proposal_messaging")) {
        return NextResponse.json(
          {
            error: "Teklif göndermeden önce mesajlaşma Pro paketine özeldir.",
            requiredPlan: "pro",
          },
          { status: 403 }
        );
      }
    }

    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        proposal_id: proposalId,
        content,
        attachment_url: null,
        attachment_name: null,
        attachment_type: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[messages/send] insert error:", insertError);
      return NextResponse.json(
        { error: "Mesaj gönderilemedi." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("[messages/send] unexpected error:", error);
    return NextResponse.json(
      { error: "Mesaj gönderilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
