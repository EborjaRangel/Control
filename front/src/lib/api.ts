import { getSessionToken } from "./session-token";

function authHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = getSessionToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    headers: authHeaders(init),
    credentials: "include",
  });
}
