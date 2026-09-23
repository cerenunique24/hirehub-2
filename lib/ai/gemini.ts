import { GoogleGenAI } from "@google/genai";

/**
 * CollaCrew — merkezi Gemini istemcisi.
 *
 * Bütün /api/ai/* endpoint'leri Gemini'yi buradan çağırmalı.
 * Model seçimi, client oluşturma, retry/backoff ve hata
 * sınıflandırması tek bir yerde tutulur.
 *
 * Environment:
 *   GEMINI_API_KEY=...
 *   GEMINI_PRIMARY_MODEL=gemini-3.8-flash
 *   GEMINI_FALLBACK_MODEL=gemini-3.6-flash
 */

const DEFAULT_PRIMARY_MODEL = "gemini-3.8-flash";
const DEFAULT_FALLBACK_MODEL = "gemini-3.6-flash";

const PRIMARY_MODEL =
  process.env.GEMINI_PRIMARY_MODEL?.trim() || DEFAULT_PRIMARY_MODEL;

const FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL;

/**
 * Her model için maksimum deneme sayısı.
 *
 * 1 = ilk istek
 * 2 = ilk retry
 * 3 = ikinci retry
 */
const MAX_ATTEMPTS_PER_MODEL = 4;

/**
 * Geçici hatalarda exponential backoff.
 */
const RETRY_DELAYS_MS = [800, 2000, 4500, 8000];

/**
 * Tek Gemini HTTP isteği için maksimum süre.
 */
const REQUEST_TIMEOUT_MS = 30000;

export class GeminiError extends Error {
  retryable: boolean;
  safeMessage?: string;

  constructor(
    message: string,
    options: {
      retryable: boolean;
      safeMessage?: string;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options.cause });

    this.name = "GeminiError";
    this.retryable = options.retryable;
    this.safeMessage = options.safeMessage;
  }
}

/**
 * Gemini SDK hatalarının farklı sürümlerinde status/code
 * farklı alanlarda bulunabildiği için mesaj + metadata üzerinden
 * güvenli şekilde string üretir.
 */
function getErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    const parts = [error.message];

    const candidate = error as Error & {
      status?: unknown;
      code?: unknown;
      statusCode?: unknown;
      response?: unknown;
      errorDetails?: unknown;
    };

    if (candidate.status !== undefined) {
      parts.push(`status=${String(candidate.status)}`);
    }

    if (candidate.statusCode !== undefined) {
      parts.push(`statusCode=${String(candidate.statusCode)}`);
    }

    if (candidate.code !== undefined) {
      parts.push(`code=${String(candidate.code)}`);
    }

    if (candidate.errorDetails !== undefined) {
      try {
        parts.push(JSON.stringify(candidate.errorDetails));
      } catch {
        // Ignore serialization failures.
      }
    }

    return parts.join(" | ");
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Geçici olarak tekrar denenmesi mantıklı hatalar.
 *
 * Örnek:
 * - 503
 * - service unavailable
 * - overloaded
 * - geçici network hataları
 * - timeout
 * - deadline exceeded
 *
 * Not:
 * 429 burada otomatik olarak retryable kabul edilmiyor.
 * Çünkü 429 hem geçici rate-limit hem de kalıcı quota olabilir.
 */
function isRetryableRawError(error: unknown): boolean {
  const message = getErrorDetails(error).toLowerCase();

  return (
    message.includes("503") ||
    message.includes("service unavailable") ||
    message.includes("high demand") ||
    message.includes("temporarily unavailable") ||
    message.includes("overloaded") ||
    message.includes("timeout") ||
    message.includes("deadline exceeded") ||
    message.includes("network") ||
    message.includes("aborted") ||
    message.includes("abort error") ||
    message.includes("econnreset") ||
    message.includes("socket hang up")
  );
}

/**
 * Model bulunamadı / desteklenmiyor gibi durumlar.
 */
function isModelUnavailableError(error: unknown): boolean {
  const message = getErrorDetails(error).toLowerCase();

  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("model not found") ||
    message.includes("unsupported model") ||
    message.includes("does not exist") ||
    message.includes("invalid model") ||
    message.includes("unknown model")
  );
}

/**
 * Kalıcı quota / billing / plan sınırı.
 *
 * RESOURCE_EXHAUSTED özellikle önemlidir.
 */
function isQuotaExceededError(error: unknown): boolean {
  const message = getErrorDetails(error).toLowerCase();

  const hasQuotaSignal =
    message.includes("quota") ||
    message.includes("resource exhausted") ||
    message.includes("exceeded your current quota") ||
    message.includes("quota exceeded") ||
    message.includes("billing") ||
    message.includes("check your plan") ||
    message.includes("plan and billing");

  const hasRateLimitSignal =
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("429");

  return (
    hasQuotaSignal ||
    (hasRateLimitSignal &&
      (message.includes("daily") ||
        message.includes("per day") ||
        message.includes("per minute") ||
        message.includes("per month") ||
        message.includes("limit exceeded")))
  );
}

/**
 * 429'un geçici rate-limit olma ihtimalini ayırmaya çalışır.
 */
function isTemporaryRateLimitError(error: unknown): boolean {
  const message = getErrorDetails(error).toLowerCase();

  if (isQuotaExceededError(error)) {
    return false;
  }

  return (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Merkezi Gemini client.
 *
 * Yeni @google/genai SDK'sında timeout httpOptions üzerinden
 * yapılandırılır.
 */
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY tanımlı değil.", {
      retryable: false,
      safeMessage: "AI servisi yapılandırılmamış.",
    });
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: REQUEST_TIMEOUT_MS,
    },
  });
}

/**
 * Gemini'nin markdown JSON response döndürmesi ihtimaline karşı
 * ```json ... ``` wrapper'ını temizler.
 */
export function cleanJsonOutput(output: string) {
  let cleaned = output.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");
  }

  return cleaned.trim();
}

/**
 * Tek bir Gemini modeline istek gönderir.
 */
async function callModel(
  modelName: string,
  prompt: string,
  temperature: number
): Promise<string> {
  const ai = getGenAI();

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      temperature,
      responseMimeType: "application/json",
    },
  });

  const output = response.text?.trim();

  if (!output) {
    throw new GeminiError("Gemini boş yanıt döndürdü.", {
      retryable: true,
    });
  }

  return output;
}

/**
 * Gemini'ye JSON üretmesi için prompt gönderir.
 *
 * Akış:
 *
 * primary model
 *   ↓
 * geçici hata → retry
 *   ↓
 * model kullanılamıyor → fallback
 *   ↓
 * quota → gereksiz retry yapma
 *   ↓
 * fallback model
 *   ↓
 * tüm seçenekler başarısız → GeminiError
 */
export async function generateJson(
  prompt: string,
  options?: {
    temperature?: number;
  }
): Promise<string> {
  const temperature = options?.temperature ?? 0.3;

  const models = Array.from(
    new Set([PRIMARY_MODEL, FALLBACK_MODEL].filter(Boolean))
  );

  let lastError: unknown = null;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const modelName = models[modelIndex];

    for (
      let attempt = 1;
      attempt <= MAX_ATTEMPTS_PER_MODEL;
      attempt++
    ) {
      try {
        console.info(
          `[CollaCrew AI] ${modelName} deneniyor ` +
            `(model ${modelIndex + 1}/${models.length}, ` +
            `deneme ${attempt}/${MAX_ATTEMPTS_PER_MODEL})`
        );

        return await callModel(modelName, prompt, temperature);
      } catch (error) {
        lastError = error;

        console.error(
          `[CollaCrew AI] ${modelName} hatası:`,
          getErrorDetails(error)
        );

        /**
         * Bizim kendi GeminiError'ımız retryable değilse
         * doğrudan yukarı gönder.
         */
        if (error instanceof GeminiError && !error.retryable) {
          throw error;
        }

        /**
         * Model gerçekten mevcut değilse retry yapma,
         * doğrudan fallback modele geç.
         */
        if (isModelUnavailableError(error)) {
          console.warn(
            `[CollaCrew AI] ${modelName} kullanılamıyor, ` +
              `bir sonraki modele geçiliyor.`
          );

          break;
        }

        /**
         * Kalıcı quota / billing problemi.
         *
         * Aynı modeli üç kez denemek gereksiz.
         */
        if (isQuotaExceededError(error)) {
          console.warn(
            `[CollaCrew AI] ${modelName} kota/plan sınırına ulaştı.`
          );

          break;
        }

        /**
         * Geçici 429 rate-limit.
         */
        if (isTemporaryRateLimitError(error)) {
          if (attempt >= MAX_ATTEMPTS_PER_MODEL) {
            break;
          }

          const delay =
            RETRY_DELAYS_MS[attempt - 1] ??
            RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];

          console.warn(
            `[CollaCrew AI] ${modelName} rate-limit nedeniyle ` +
              `${delay}ms sonra tekrar denenecek.`
          );

          await wait(delay);
          continue;
        }

        /**
         * 503 / timeout / network vb.
         */
        const retryable =
          error instanceof GeminiError
            ? error.retryable
            : isRetryableRawError(error);

        if (!retryable) {
          throw error;
        }

        if (attempt >= MAX_ATTEMPTS_PER_MODEL) {
          break;
        }

        const delay =
          RETRY_DELAYS_MS[attempt - 1] ??
          RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];

        console.warn(
          `[CollaCrew AI] ${modelName} geçici hata nedeniyle ` +
            `${delay}ms sonra tekrar denenecek.`
        );

        await wait(delay);
      }
    }
  }

  /**
   * Bizim GeminiError'ımız zaten doğru şekilde sınıflandırılmışsa
   * tekrar sarmalamaya gerek yok.
   */
  if (lastError instanceof GeminiError) {
    throw lastError;
  }

  /**
   * Son hata quota ise kullanıcıya doğru güvenli mesajı döndür.
   */
  if (isQuotaExceededError(lastError)) {
    throw new GeminiError(
      lastError instanceof Error
        ? lastError.message
        : "AI kota sınırı aşıldı.",
      {
        retryable: false,
        safeMessage:
          "AI servisinin kullanım kotası doldu. Lütfen API planınızı ve kullanım kotanızı kontrol edin.",
        cause: lastError,
      }
    );
  }

  /**
   * Model bulunamadıysa bunu geçici servis problemi olarak
   * kullanıcıya yansıtmıyoruz; server tarafında loglanıyor.
   */
  if (isModelUnavailableError(lastError)) {
    throw new GeminiError(
      lastError instanceof Error
        ? lastError.message
        : "Gemini modeli kullanılamıyor.",
      {
        retryable: false,
        safeMessage:
          "AI modeli şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
        cause: lastError,
      }
    );
  }

  const retryable = isRetryableRawError(lastError);

  throw new GeminiError(
    lastError instanceof Error
      ? lastError.message
      : "AI isteği tamamlanamadı.",
    {
      retryable,
      cause: lastError,
    }
  );
}

/**
 * Route handler'ların catch bloğunda kullanılacak güvenli response.
 *
 * Ham Gemini hatası kullanıcıya gönderilmez.
 * Detay terminal/server logunda tutulur.
 */
export function toSafeAiResponse(
  error: unknown,
  safeMessages: string[] = []
) {
  console.error(
    "[CollaCrew AI] İşlenmemiş hata:",
    getErrorDetails(error)
  );

  if (error instanceof GeminiError) {
    if (error.retryable) {
      return {
        status: 503 as const,
        body: {
          error:
            "AI analizi şu anda kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.",
          retryable: true,
        },
      };
    }

    return {
      status: 500 as const,
      body: {
        error:
          error.safeMessage ?? "AI isteği tamamlanamadı.",
        retryable: false,
      },
    };
  }

  if (
    isRetryableRawError(error) ||
    isTemporaryRateLimitError(error)
  ) {
    return {
      status: 503 as const,
      body: {
        error:
          "AI analizi şu anda kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.",
        retryable: true,
      },
    };
  }

  if (isModelUnavailableError(error)) {
    return {
      status: 503 as const,
      body: {
        error:
          "AI modeli şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
        retryable: true,
      },
    };
  }

  if (
    error instanceof Error &&
    safeMessages.some((message) =>
      error.message.includes(message)
    )
  ) {
    return {
      status: 500 as const,
      body: {
        error: error.message,
        retryable: false,
      },
    };
  }

  return {
    status: 500 as const,
    body: {
      error:
        "İşlem şu anda tamamlanamadı. Lütfen tekrar deneyin.",
      retryable: false,
    },
  };
}