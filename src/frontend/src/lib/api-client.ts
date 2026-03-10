// src/lib/api-client.ts

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

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // In a real implementation with MSAL, you would inject the Bearer token here
    // const token = await getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

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
