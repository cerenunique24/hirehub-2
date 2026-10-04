import OpenAI from "openai";

/**
 * CollaCrew
 * Merkezi OpenAI istemcisi.
 *
 * Bütün /api/ai/* endpoint'leri OpenAI'yi buradan çağırmalı.
 *
 * Environment:
 *   OPENAI_API_KEY=...
 *   OPENAI_PRIMARY_MODEL=gpt-5.4-mini
 */

const DEFAULT_MODEL = "gpt-5.4-mini";

const MODEL =
  process.env.OPENAI_PRIMARY_MODEL?.trim() || DEFAULT_MODEL;

const MAX_ATTEMPTS = 3;

const RETRY_DELAYS_MS = [800, 2000, 4500];

const REQUEST_TIMEOUT_MS = 30000;

let client: OpenAI | null = null;

export class OpenAIError extends Error {
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

    this.name = "OpenAIError";
    this.retryable = options.retryable;
    this.safeMessage = options.safeMessage;
  }
}

function getErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    const parts = [error.message];

    const candidate = error as Error & {
      status?: unknown;
      code?: unknown;
      statusCode?: unknown;
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

    return parts.join(" | ");
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getOpenAI(): OpenAI {
  if (client) {
    return client;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new OpenAIError("OPENAI_API_KEY tanımlı değil.", {
      retryable: false,
      safeMessage: "AI servisi yapılandırılmamış.",
    });
  }

  client = new OpenAI({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });

  return client;
}

function isRetryableError(error: unknown): boolean {
  const message = getErrorDetails(error).toLowerCase();

  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("network") ||
    message.includes("econnreset") ||
    message.includes("socket hang up") ||
    message.includes("service unavailable") ||
    message.includes("internal server error") ||
    message.includes("503")
  );
}

function isRateLimitError(error: unknown): boolean {
  const message = getErrorDetails(error).toLowerCase();

  return (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  );
}

function isAuthError(error: unknown): boolean {
  const message = getErrorDetails(error).toLowerCase();

  return (
    message.includes("401") ||
    message.includes("invalid api key") ||
    message.includes("authentication")
  );
}

function isModelError(error: unknown): boolean {
  const message = getErrorDetails(error).toLowerCase();

  return (
    message.includes("model") &&
    (
      message.includes("not found") ||
      message.includes("does not exist") ||
      message.includes("invalid")
    )
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function cleanJsonOutput(output: string): string {
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

async function callModel(
  prompt: string,
  temperature: number
): Promise<string> {
  const openai = getOpenAI();

  const response = await openai.responses.create({
    model: MODEL,
    input: prompt,
    temperature,
    text: {
      format: {
        type: "json_object",
      },
    },
  });

  const usage = response.usage;

  console.info(
    `[CollaCrew AI TOKEN] model=${MODEL} ` +
      `input=${usage?.input_tokens ?? 0} ` +
      `output=${usage?.output_tokens ?? 0} ` +
      `total=${usage?.total_tokens ?? 0}`
  );

  const output = response.output_text?.trim();

  if (!output) {
    throw new OpenAIError("OpenAI boş yanıt döndürdü.", {
      retryable: true,
    });
  }

  return output;
}

export async function generateJson(
  prompt: string,
  options?: {
    temperature?: number;
  }
): Promise<string> {
  const temperature = options?.temperature ?? 0.3;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.info(
        `[CollaCrew AI] OpenAI ${MODEL} deneniyor ` +
          `(deneme ${attempt}/${MAX_ATTEMPTS})`
      );

      return await callModel(prompt, temperature);
    } catch (error) {
      lastError = error;

      console.error(
        `[CollaCrew AI] OpenAI hatası:`,
        getErrorDetails(error)
      );

      if (isAuthError(error)) {
        throw new OpenAIError(
          "OpenAI API kimlik doğrulaması başarısız.",
          {
            retryable: false,
            safeMessage:
              "AI servisi yapılandırmasında bir sorun var.",
            cause: error,
          }
        );
      }

      if (isModelError(error)) {
        throw new OpenAIError(
          `OpenAI modeli kullanılamıyor: ${MODEL}`,
          {
            retryable: false,
            safeMessage:
              "AI modeli şu anda kullanılamıyor.",
            cause: error,
          }
        );
      }

      const retryable =
        isRetryableError(error) ||
        isRateLimitError(error);

      if (!retryable) {
        throw error;
      }

      if (attempt >= MAX_ATTEMPTS) {
        break;
      }

      const delay =
        RETRY_DELAYS_MS[attempt - 1] ??
        RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];

      console.warn(
        `[CollaCrew AI] ${delay}ms sonra tekrar denenecek.`
      );

      await wait(delay);
    }
  }

  if (lastError instanceof OpenAIError) {
    throw lastError;
  }

  throw new OpenAIError(
    lastError instanceof Error
      ? lastError.message
      : "OpenAI isteği tamamlanamadı.",
    {
      retryable: true,
      cause: lastError,
    }
  );
}

export function toSafeAiResponse(
  error: unknown,
  safeMessages: string[] = []
) {
  console.error(
    "[CollaCrew AI] İşlenmemiş hata:",
    getErrorDetails(error)
  );

  if (error instanceof OpenAIError) {
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
    isRetryableError(error) ||
    isRateLimitError(error)
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