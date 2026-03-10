// src/lib/api-client.ts
import { getSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;

    const session: any = typeof window !== "undefined" ? await getSession() : null;
    const token = session?.accessToken;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'x-correlation-id': (options.headers as any)?.['x-correlation-id'] || uuidv4(),
      ...options.headers,
    };

    if (token) {
      (headers as any)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });
    const json = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: json.error || { code: 'HTTP_ERROR', message: `HTTP ${response.status}` },
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
