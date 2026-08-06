export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const body = await parseBody(response);

  if (!response.ok) {
    const record =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : null;
    const message =
      record && typeof record.message === "string"
        ? record.message
        : record && typeof record.error === "string"
          ? record.error
          : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

export const apiClient = {
  get: <T>(url: string, init?: RequestInit) =>
    request<T>(url, { method: "GET", ...init }),
  post: <T>(url: string, data?: unknown, init?: RequestInit) =>
    request<T>(url, {
      method: "POST",
      body: data === undefined ? undefined : JSON.stringify(data),
      ...init,
    }),
  put: <T>(url: string, data?: unknown, init?: RequestInit) =>
    request<T>(url, {
      method: "PUT",
      body: data === undefined ? undefined : JSON.stringify(data),
      ...init,
    }),
  delete: <T>(url: string, init?: RequestInit) =>
    request<T>(url, { method: "DELETE", ...init }),
};
