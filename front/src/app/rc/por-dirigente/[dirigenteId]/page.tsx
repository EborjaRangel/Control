"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { apiJson } from "@/lib/api-response";

export default function RcPorDirigentePage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const router = useRouter();
  const { isStaff } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isStaff) return;

    void (async () => {
      try {
        const res = await apiFetch(`/api/rc/por-dirigente/${dirigenteId}`, { method: "POST" });
        const rc = await apiJson<{ id: string }>(res);
        router.replace(`/rc/${rc.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al abrir representantes");
      }
    })();
  }, [dirigenteId, isStaff, router]);

  if (!isStaff) return null;

  if (error) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error}</div>
        <button type="button" className="btn-ghost" onClick={() => router.push("/rc")}>
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-ink-secondary">
      <span className="size-5 animate-pulse rounded-full bg-pin-light" />
      Preparando representantes de casilla…
    </div>
  );
}
