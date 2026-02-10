import { getToken } from "./auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  const url = `${API_BASE_URL}${path}`;

  const token = getToken();

  // 👇 Make this a plain object, not HeadersInit
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (data && (data.error as string)) || `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return data;
}