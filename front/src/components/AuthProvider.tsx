"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { homeForUser, pathAllowedForUser } from "@/lib/mi-panel";
import { canManageConvocatoria, canTakeAsistencia, hasAdminPrivilegesRol, isAdminRol, isAsistenciaRol, isConvocatoriaRol, isCoordinadorRol, isStaffRol } from "@/lib/auth";
import { clearSessionToken, getSessionToken, setSessionToken } from "@/lib/session-token";

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
const PUBLIC_PATHS = new Set(["/login"]);

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
  return (await res.json()) as SessionUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    setUser(await fetchMe());
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
    if (loading) return;
    if (!user && !PUBLIC_PATHS.has(pathname)) {
      router.replace("/login");
      return;
    }
    if (user && pathname === "/login") {
      router.replace(homeForUser(user));
      return;
    }
    if (user && !isStaffRol(user.rol) && pathname !== "/login" && !pathAllowedForUser(user, pathname)) {
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
      setUser(session);
      router.replace(homeForUser(session));
    },
    [router],
  );

  const logout = useCallback(async () => {
    clearSessionToken();
    setUser(null);
    await apiFetch("/api/auth/logout", { method: "POST" });
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

  if (loading && !PUBLIC_PATHS.has(pathname)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        <span className="ml-3">Verificando sesión…</span>
      </div>
    );
  }

  if (!user && !PUBLIC_PATHS.has(pathname)) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
