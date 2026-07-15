const STORAGE_KEY = "control_session_token";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setSessionToken(token: string) {
  sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearSessionToken() {
  sessionStorage.removeItem(STORAGE_KEY);
}
