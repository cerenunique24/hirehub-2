import type { SupabaseClient } from "@supabase/supabase-js";

export const RATE_LIMIT_MESSAGE = "Çok fazla istek gönderdiniz. Lütfen biraz sonra tekrar deneyin.";

/**
 * Paylaşılan Postgres tabanlı rate limiter (`public.check_rate_limit` RPC).
 * Vercel/serverless'ta in-memory sayaç instance'lar arası tutarlı
 * olmadığı için, yeni bir harici servis (Upstash/Redis) eklemeden mevcut
 * Supabase Postgres'i kalıcı, paylaşılan sayaç deposu olarak kullanır.
 *
 * `key` kullanıcı/IP + endpoint'i birlikte kodlamalı, ör:
 * `rateLimitKey("ai_analyze_project", userId)`.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  max: number,
  windowSeconds: number
): Promise<{ ok: boolean }> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Rate limiter'ın kendisi arızalıysa isteği tamamen bloklamak asıl
    // özelliği (mesajlaşma, teklif, AI analizi) kullanıcıya karşı
    // gereksiz yere kırar — "fail open" + sunucu logunda görünür hata.
    console.error("[rate-limit] check_rate_limit RPC hatası:", error);
    return { ok: true };
  }

  return { ok: data === true };
}

export function rateLimitKey(endpoint: string, identifier: string): string {
  return `${endpoint}:${identifier}`;
}

/** İstek başlıklarından, proxy arkasında da makul bir istemci IP'si çıkarır. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
