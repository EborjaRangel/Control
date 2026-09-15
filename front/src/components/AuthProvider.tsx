"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AxisAnimatedMark } from "@/components/AxisAnimatedMark";
import type { SessionUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { homeForUser, pathAllowedForUser } from "@/lib/mi-panel";
import { isPaseListaLocation, isPaseListaPath } from "@/lib/pase-lista-path";
import { canManageConvocatoria, canTakeAsistencia, hasAdminPrivilegesRol, isAdminRol, isAsistenciaRol, isConvocatoriaRol, isCoordinadorRol, isStaffRol } from "@/lib/auth";
import {
  clearSessionToken,
  getCachedSessionUser,
  getSessionToken,
  setCachedSessionUser,
  setSessionToken,
} from "@/lib/session-token";

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isStaff: boolean;
  isAdmin: boolean;
  isCoordinador: boolean;
  hasAdminPrivileges: boolean;
  isAsistencia: boolean;
  isConvocatoria: boolean;
  canTakeAsistencia: boolean;
  canManageConvocatoria: boolean;
  isDetectado: boolean;
  isRc: boolean;
  isRg: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_ENTRY_PATHS = new Set(["/login", "/login/recuperar"]);

function isAuthEntryPath(pathname: string) {
  return AUTH_ENTRY_PATHS.has(pathname) || pathname.startsWith("/login/restablecer/");
}

function isOpenPath(pathname: string) {
  return isAuthEntryPath(pathname) || isPaseListaPath(pathname);
}

function isOpenNow(pathname: string) {
  if (isOpenPath(pathname) || isPaseListaLocation()) return true;
  if (typeof window !== "undefined" && isPaseListaPath(window.location.pathname)) return true;
  return false;
}

type LoginResponse = SessionUser & {
  token?: string;
  error?: string;
  detalles?: string[];
};

async function fetchMe(): Promise<SessionUser | null> {
  if (!getSessionToken()) return null;
  const res = await apiFetch("/api/auth/me");
  if (!res.ok) {
    if (res.status === 401) clearSessionToken();
    return null;
  }
  const me = (await res.json()) as SessionUser;
  setCachedSessionUser(me);
  return me;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    setUser(await fetchMe());
  }, []);

  useLayoutEffect(() => {
    if (!getSessionToken()) {
      setLoading(false);
      return;
    }
    const cached = getCachedSessionUser<SessionUser>();
    if (cached) {
      setUser(cached);
      setLoading(false);
    }
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const codigo = new URLSearchParams(window.location.search).get("c")?.trim();
    if (codigo && !isPaseListaPath(window.location.pathname)) {
      window.location.replace(`/pase?c=${encodeURIComponent(codigo)}`);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchMe().then((me) => {
      if (!cancelled) {
        setUser(me);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const codigo = new URLSearchParams(window.location.search).get("c")?.trim();
      const path = window.location.pathname;
      if (codigo && !isPaseListaPath(path)) {
        router.replace(`/pase?c=${encodeURIComponent(codigo)}`);
        return;
      }
    }
    if (loading) return;
    if (isOpenNow(pathname)) {
      if (user && isAuthEntryPath(pathname) && !isPaseListaPath(pathname) && !isPaseListaLocation()) {
        router.replace(homeForUser(user));
      }
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user && isAuthEntryPath(pathname)) {
      router.replace(homeForUser(user));
      return;
    }
    if (user && !pathAllowedForUser(user, pathname)) {
      router.replace(homeForUser(user));
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(
    async (username: string, password: string) => {
      clearSessionToken();
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as LoginResponse;
      if (!res.ok) {
        throw new Error(data.detalles?.join(", ") ?? data.error ?? "No se pudo iniciar sesión");
      }
      if (!data.token) {
        throw new Error("No se recibió el token de sesión");
      }
      const { token, error: _error, detalles: _detalles, ...session } = data;
      setSessionToken(token);
      setCachedSessionUser(session);
      setUser(session);
      router.replace(homeForUser(session));
    },
    [router],
  );

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    clearSessionToken();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refresh,
      isStaff: isStaffRol(user?.rol),
      isAdmin: isAdminRol(user?.rol),
      isCoordinador: isCoordinadorRol(user?.rol),
      hasAdminPrivileges: hasAdminPrivilegesRol(user?.rol),
      isAsistencia: isAsistenciaRol(user?.rol),
      isConvocatoria: isConvocatoriaRol(user?.rol),
      canTakeAsistencia: canTakeAsistencia(user?.rol),
      canManageConvocatoria: canManageConvocatoria(user?.rol),
      isDetectado: user?.rol === "DETECTADO",
      isRc: user?.rol === "RC",
      isRg: user?.rol === "RG",
    }),
    [user, loading, login, logout, refresh],
  );

  if (loading && !isOpenNow(pathname)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-ink-secondary">
        <AxisAnimatedMark variant="icon" mode="idle" size={72} title="AXIS" />
        <span className="text-sm">Verificando sesión…</span>
      </div>
    );
  }

  if (!user && !isOpenNow(pathname)) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
