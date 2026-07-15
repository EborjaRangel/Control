"use client";

import { useRouter } from "next/navigation";
import { DirigenteForm } from "@/components/DirigenteForm";
import { apiFetch } from "@/lib/api";
import { apiJson } from "@/lib/api-response";
import { EMPTY_DIRIGENTE } from "@/lib/types";
import type { DirigenteFormValues } from "@/lib/validation";

export default function NuevoDirigentePage() {
  const router = useRouter();

  async function handleSubmit(values: DirigenteFormValues) {
    const res = await apiFetch("/api/dirigentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const created = await apiJson<{ id: string }>(res);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="page-title">Nuevo dirigente</h1>
        <p className="page-subtitle">Registra un nuevo dirigente en el sistema.</p>
      </div>
      <DirigenteForm
        initialValues={EMPTY_DIRIGENTE}
        onSubmit={handleSubmit}
        submitLabel="Crear dirigente"
        cancelHref="/"
        modo="crear"
      />
    </div>
  );
}
