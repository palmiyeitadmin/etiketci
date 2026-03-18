// src/lib/api-client.ts
import { getSession } from "next-auth/react";
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

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = buildApiUrl(endpoint);

    const session: any = typeof window !== "undefined" ? await getSession() : null;
    const token = session?.accessToken;

    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers: HeadersInit = {
      'x-correlation-id': (options.headers as any)?.['x-correlation-id'] || uuidv4(),
      ...options.headers,
    };

    if (options.body !== undefined && !isFormData && !(headers as any)["Content-Type"]) {
      (headers as any)["Content-Type"] = "application/json";
    }

    if (token) {
      (headers as any)['Authorization'] = `Bearer ${token}`;
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
        error: normalizeApiError(json.error, response.status),
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
