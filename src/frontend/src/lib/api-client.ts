// src/lib/api-client.ts
import { v4 as uuidv4 } from "uuid";
import { buildApiUrl } from "@/lib/api-base-url";

export type ApiResponse<T> = {
  success: true;
  data: T;
  correlationId?: string;
} | {
  success: false;
  error: {
    code: string;
    message: string;
    target?: string;
    validationErrors?: Array<{
      field: string;
      message: string;
    }>;
  };
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

function extractErrorFromResponse(json: Record<string, unknown>, status: number) {
  // Format 1: { success: false, error: "..." } or { success: false, error: { message: "..." } }
  if (json.error !== undefined) {
    return normalizeApiError(json.error, status);
  }

  // Format 2: { success: false, errors: ["desc1", "desc2"] } (Identity errors)
  if (Array.isArray(json.errors)) {
    const messages = (json.errors as unknown[])
      .map((item) => (typeof item === "string" ? item : (item as Record<string, unknown>)?.description ?? String(item)))
      .filter(Boolean);
    return { code: "VALIDATION_ERROR", message: messages.join(" ") || `HTTP ${status}` };
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
        error: extractErrorFromResponse(json, response.status),
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
