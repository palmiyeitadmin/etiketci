// src/lib/api-client.ts
import { v4 as uuidv4 } from "uuid";
import { buildApiUrl } from "@/lib/api-base-url";
import { apiErrorText, type IdentityErrorItem } from "@/lib/backend-text";
import { useLanguageStore } from "@/lib/i18n/useLanguageStore";

export type ApiError = {
  /** Stable backend code (e.g. "print_intent_not_found"), or API_ERROR / HTTP_ERROR / NETWORK_ERROR. */
  code: string;
  /** Text to show: in the user's language when the code is known, else the backend's (English) text. */
  message: string;
  /** The backend's own English text, kept when `message` was translated. */
  detail?: string;
  /** Values the backend sent with the code (e.g. `{ status: "Pending" }`). */
  params?: Record<string, string>;
  /** ASP.NET Identity rules that failed (code "identity_error"). */
  identityErrors?: IdentityErrorItem[];
  target?: string;
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
};

export type ApiResponse<T> = {
  success: true;
  data: T;
  correlationId?: string;
} | {
  success: false;
  error: ApiError;
  correlationId?: string;
};

function normalizeApiError(error: unknown, status: number) {
  if (typeof error === "string" && error.trim()) {
    return { code: "API_ERROR", message: error };
  }

  if (error && typeof error === "object") {
    const errorRecord = error as Record<string, unknown>;
    const message = typeof errorRecord.message === "string" && errorRecord.message.trim()
      ? errorRecord.message
      : `HTTP ${status}`;

    return {
      code: typeof errorRecord.code === "string" && errorRecord.code.trim() ? errorRecord.code : "API_ERROR",
      message,
      target: typeof errorRecord.target === "string" ? errorRecord.target : undefined,
      validationErrors: Array.isArray(errorRecord.validationErrors) ? errorRecord.validationErrors as Array<{ field: string; message: string }> : undefined,
    };
  }

  return { code: "HTTP_ERROR", message: `HTTP ${status}` };
}

function readParams(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, String(item ?? "")]));
}

/** Identity rules as `{ code, description, params }` objects; plain strings (older responses) have no code. */
function readIdentityErrors(value: unknown): IdentityErrorItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.flatMap((item): IdentityErrorItem[] => {
    if (typeof item === "string") return item ? [{ code: "", description: item }] : [];
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const description = typeof record.description === "string" ? record.description : "";
    const code = typeof record.code === "string" ? record.code : "";
    return description || code ? [{ code, description, params: readParams(record.params) }] : [];
  });
  return items.length > 0 ? items : undefined;
}

export function extractErrorFromResponse(json: Record<string, unknown>, status: number): ApiError {
  // Format 1: { success: false, error: "...", code?: "x", params?: {...}, errors?: [{ code, description }] }
  // or { success: false, error: { message: "..." } }
  if (json.error !== undefined) {
    const normalized: ApiError = normalizeApiError(json.error, status);
    // Backend errors carry a stable code next to the English message ({ error: "...", code: "x", params: {...} }).
    const withCode: ApiError = typeof json.code === "string" && json.code.trim() ? { ...normalized, code: json.code } : normalized;
    const params = readParams(json.params);
    const identityErrors = readIdentityErrors(json.errors);
    return {
      ...withCode,
      ...(params ? { params } : {}),
      ...(identityErrors ? { identityErrors } : {}),
    };
  }

  // Format 2: { success: false, errors: ["desc1", "desc2"] } or [{ code, description }] (Identity errors)
  if (Array.isArray(json.errors)) {
    const identityErrors = readIdentityErrors(json.errors);
    const messages = (identityErrors ?? []).map((item) => item.description || item.code);
    return { code: "VALIDATION_ERROR", message: messages.join(" ") || `HTTP ${status}`, ...(identityErrors ? { identityErrors } : {}) };
  }

  // Format 3: { title: "...", status: 400, errors: { field: ["msg"] } } (ApiController model validation)
  if (json.errors && typeof json.errors === "object" && !Array.isArray(json.errors)) {
    const errorEntries = Object.entries(json.errors as Record<string, string[]>);
    const messages = errorEntries.flatMap(([, msgs]) => msgs);
    return { code: "MODEL_VALIDATION_ERROR", message: messages.join(" ") || (typeof json.title === "string" ? json.title : `HTTP ${status}`) };
  }

  // Fallback: try top-level message
  if (typeof json.message === "string" && json.message.trim()) {
    return { code: "API_ERROR", message: json.message };
  }

  return { code: "HTTP_ERROR", message: `HTTP ${status}` };
}

/** The user's language on the client; null on the server, where the stored choice is unknown. */
function currentLocale() {
  if (typeof window === "undefined") return null;
  try {
    return useLanguageStore.getState().locale;
  } catch {
    return null;
  }
}

/**
 * Puts the text for a known backend code (or the Identity rules) in the user's language into `message`
 * and keeps the English in `detail`. Unknown codes keep the backend's message.
 */
export function localizeApiError(error: ApiError, locale = currentLocale()): ApiError {
  if (!locale) return error;
  const message = apiErrorText(locale, error, error.message);
  return message === error.message ? error : { ...error, message, detail: error.message };
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = buildApiUrl(endpoint);

    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers: HeadersInit = {
      'x-correlation-id': (options.headers as any)?.['x-correlation-id'] || uuidv4(),
      ...options.headers,
    };

    if (options.body !== undefined && !isFormData && !(headers as any)["Content-Type"]) {
      (headers as any)["Content-Type"] = "application/json";
    }

    const response = await fetch(url, { 
      ...options, 
      headers,
      credentials: 'include' 
    });
    const json = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: localizeApiError(extractErrorFromResponse(json, response.status)),
        correlationId: json.correlationId,
      };
    }

    return json as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: (error as Error).message },
    };
  }
}
