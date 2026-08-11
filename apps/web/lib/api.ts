export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
export const API_ORIGIN = new URL(API_URL).origin;

export function mediaUrl(path: string | null | undefined) {
  return path ? new URL(path, API_ORIGIN).toString() : null;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? "请求失败，请稍后重试");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
