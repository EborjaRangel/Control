const STORAGE_KEY = "control_session_token";
const USER_KEY = "control_session_user";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setSessionToken(token: string) {
  sessionStorage.setItem(STORAGE_KEY, token);
}

export function getCachedSessionUser<T>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCachedSessionUser(user: unknown) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSessionToken() {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(USER_KEY);
}
