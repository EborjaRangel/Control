"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AltaOperadorDesdeDirigente } from "@/components/AltaOperadorDesdeDirigente";
import { apiFetch } from "@/lib/api";
import { apiJson } from "@/lib/api-response";

export default function NuevoRcPage() {
  const router = useRouter();
  const { isStaff } = useAuth();
  if (!isStaff) return null;

  async function handleSubmit(payload: {
    dirigenteId: string;
    usuario: string;
    password: string;
  }) {
    const res = await apiFetch("/api/rc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const created = await apiJson<{ id: string }>(res);
    router.push(`/rc/${created.id}`);
  }

  return (
    <AltaOperadorDesdeDirigente
      modo="rc"
      titulo="Nuevo responsable de casilla"
      subtitulo="Selecciona un dirigente activo y asigna sus credenciales de acceso."
      submitLabel="Crear responsable de casilla"
      cancelHref="/rc"
      onSubmit={handleSubmit}
    />
  );
}
