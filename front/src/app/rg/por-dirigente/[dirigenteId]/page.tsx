"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { apiJson } from "@/lib/api-response";
import { canViewOwnDirigente } from "@/lib/mi-panel";

export default function RgPorDirigentePage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const router = useRouter();
  const { isStaff, user, refresh } = useAuth();
  const canAccess = isStaff || canViewOwnDirigente(user, dirigenteId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canAccess) return;

    void (async () => {
      try {
        const res = await apiFetch(`/api/rg/por-dirigente/${dirigenteId}`, { method: "POST" });
        const rg = await apiJson<{ id: string }>(res);
        await refresh();
        router.replace(`/rg/${rg.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al abrir representantes");
      }
    })();
  }, [dirigenteId, canAccess, router, refresh]);

  if (!canAccess) return null;

  if (error) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error}</div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() =>
            router.push(
              user?.dirigenteId
                ? `/dirigentes/${user.dirigenteId}/consultar`
                : "/rg",
            )
          }
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-ink-secondary">
      <span className="size-5 animate-pulse rounded-full bg-pin-light" />
      Preparando representantes generales…
    </div>
  );
}
