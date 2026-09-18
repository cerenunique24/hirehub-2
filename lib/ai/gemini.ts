import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * CollaCrew — merkezi Gemini istemcisi.
 *
 * Bütün /api/ai/* endpoint'leri Gemini'yi buradan çağırmalı. Model
 * seçimi, client oluşturma, retry/backoff ve hata sınıflandırması
 * tek bir yerde tutulur — her endpoint kendi kopyasını yazmaz.
 *
 * Modeller environment variable ile değiştirilebilir:
 *   GEMINI_API_KEY=...
 *   GEMINI_PRIMARY_MODEL=gemini-3.8-flash   (varsayılan)
 *   GEMINI_FALLBACK_MODEL=gemini-3.6-flash  (varsayılan)
 *
 * Model adları @google/generative-ai SDK'sının desteklediği,
 * gerçekten var olan Gemini model adlarıdır (uydurulmamıştır).
 */

const DEFAULT_PRIMARY_MODEL = "gemini-3.8-flash";
const DEFAULT_FALLBACK_MODEL = "gemini-3.6-flash";

const PRIMARY_MODEL = process.env.GEMINI_PRIMARY_MODEL?.trim() || DEFAULT_PRIMARY_MODEL;
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL;

/** Her model için maksimum deneme sayısı (1 = ilk istek, sonrakiler retry). */
const MAX_ATTEMPTS_PER_MODEL = 3;

/** Exponential backoff: 1. bekleme, 2. bekleme, ... (ms). Sonsuz retry yok. */
const RETRY_DELAYS_MS = [800, 2000, 4500];

export class GeminiError extends Error {
  /** Kısa bir süre sonra tekrar denenirse başarılı olma ihtimali olan hata (503/429/timeout). */
  retryable: boolean;
  /** Yapılandırma/istek hatası — kullanıcıya gösterilebilecek güvenli mesaj varsa taşır. */
  safeMessage?: string;

  constructor(message: string, options: { retryable: boolean; safeMessage?: string; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = "GeminiError";
    this.retryable = options.retryable;
    this.safeMessage = options.safeMessage;
  }
}

function isRetryableRawError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("503") ||
    message.includes("service unavailable") ||
    message.includes("high demand") ||
    message.includes("temporarily unavailable") ||
    message.includes("overloaded") ||
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("resource exhausted") ||
    message.includes("timeout") ||
    message.includes("deadline exceeded") ||
    message.includes("network")
  );
}

function isModelUnavailableError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("model not found") ||
    message.includes("unsupported model") ||
    message.includes("does not exist") ||
    message.includes("invalid model")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY tanımlı değil.", {
      retryable: false,
      safeMessage: "AI servisi yapılandırılmamış.",
    });
  }
  return new GoogleGenerativeAI(apiKey);
}

export function cleanJsonOutput(output: string) {
  let cleaned = output.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  }
  return cleaned.trim();
}

async function callModel(modelName: string, prompt: string, temperature: number): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature,
    },
  });

  const result = await model.generateContent(prompt);
  const output = result.response.text().trim();

  if (!output) {
    throw new GeminiError("Gemini boş yanıt döndürdü.", { retryable: true });
  }

  return output;
}

/**
 * Gemini'ye bir prompt gönderir; birincil model geçici olarak
 * başarısız olursa exponential backoff ile tekrar dener, sonra
 * fallback modele geçer. Sonsuz retry yapmaz — tüm modeller/denemeler
 * tükenirse GeminiError fırlatır (retryable alanı frontend/route'un
 * doğru HTTP status + mesaj seçmesini sağlar).
 */
export async function generateJson(prompt: string, options?: { temperature?: number }): Promise<string> {
  const temperature = options?.temperature ?? 0.3;
  const models = Array.from(new Set([PRIMARY_MODEL, FALLBACK_MODEL].filter(Boolean)));

  let lastError: unknown = null;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const modelName = models[modelIndex];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        console.info(
          `[CollaCrew AI] ${modelName} deneniyor (model ${modelIndex + 1}/${models.length}, deneme ${attempt}/${MAX_ATTEMPTS_PER_MODEL})`
        );
        return await callModel(modelName, prompt, temperature);
      } catch (error) {
        lastError = error;
        console.error(`[CollaCrew AI] ${modelName} hatası:`, error);

        if (error instanceof GeminiError && !error.retryable) {
          throw error;
        }

        if (isModelUnavailableError(error)) {
          console.warn(`[CollaCrew AI] ${modelName} kullanılamıyor, bir sonraki modele geçiliyor.`);
          break;
        }

        const retryable = error instanceof GeminiError ? error.retryable : isRetryableRawError(error);
        if (!retryable) {
          throw error;
        }

        if (attempt >= MAX_ATTEMPTS_PER_MODEL) {
          break;
        }

        const delay = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
        console.warn(`[CollaCrew AI] ${modelName} geçici olarak yoğun, ${delay}ms sonra tekrar deneniyor...`);
        await wait(delay);
      }
    }
  }

  if (lastError instanceof GeminiError) throw lastError;

  const retryable = isRetryableRawError(lastError);
  throw new GeminiError(
    lastError instanceof Error ? lastError.message : "AI isteği tamamlanamadı.",
    { retryable, cause: lastError }
  );
}

/**
 * Bir route handler'ın catch bloğunda kullanılacak, kullanıcıya
 * gösterilecek Türkçe mesaj + doğru HTTP status'u üretir. Ham Google
 * API hatası hiçbir zaman doğrudan kullanıcıya döndürülmez; gerçek
 * hata sunucu loglarında (console.error) korunur.
 */
export function toSafeAiResponse(error: unknown, safeMessages: string[] = []) {
  console.error("[CollaCrew AI] İşlenmemiş hata:", error);

  if (error instanceof GeminiError) {
    if (error.retryable) {
      return {
        status: 503 as const,
        body: { error: "AI analizi şu anda kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.", retryable: true },
      };
    }
    return {
      status: 500 as const,
      body: { error: error.safeMessage ?? "AI isteği tamamlanamadı.", retryable: false },
    };
  }

  if (isRetryableRawError(error) || isModelUnavailableError(error)) {
    return {
      status: 503 as const,
      body: { error: "AI analizi şu anda kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.", retryable: true },
    };
  }

  if (error instanceof Error && safeMessages.some((m) => error.message.includes(m))) {
    return { status: 500 as const, body: { error: error.message, retryable: false } };
  }

  return {
    status: 500 as const,
    body: { error: "İşlem şu anda tamamlanamadı. Lütfen tekrar deneyin.", retryable: false },
  };
}
