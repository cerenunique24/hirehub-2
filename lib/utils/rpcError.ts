/**
 * Supabase RPC / trigger hatalarını kullanıcıya gösterilecek metne çevirir.
 *
 * Marketplace RPC'leri ve trigger'ları iş kuralı ihlallerini `P0001`
 * (raise exception) ile Türkçe mesaj olarak döndürür; bunlar doğrudan
 * gösterilir. Diğer (teknik) hatalar ham metin olarak sızdırılmaz — verilen
 * fallback kullanılır.
 */
export function friendlyRpcError(
  error: { code?: string; message?: string } | null | undefined,
  fallback: string
): string {
  if (!error) return fallback;

  if (error.code === "P0001" && error.message) return error.message;
  if (error.code === "23505") return "Bu işlem daha önce yapılmış.";
  if (error.code === "42501" || /row-level security|permission denied/i.test(error.message ?? "")) {
    return "Bu işlem için yetkin yok.";
  }

  return fallback;
}
