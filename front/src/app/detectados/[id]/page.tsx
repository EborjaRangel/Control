"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DetectadoForm } from "@/components/DetectadoForm";
import { apiFetch } from "@/lib/api";
import { detectadoToFormValues, type DetectadoDTO } from "@/lib/detectados";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import type { DetectadoFormValues } from "@/lib/validation-detectado";

export default function DetectadoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin, user } = useAuth();
  const [detectado, setDetectado] = useState<DetectadoDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canLoad = isAdmin || Boolean(user?.dirigenteId);

  const backHref = detectado?.dirigenteId
    ? isAdmin
      ? `/detectados/dirigentes/${detectado.dirigenteId}`
      : `/detectados/dirigentes/${detectado.dirigenteId}`
    : isAdmin
      ? "/detectados"
      : user?.dirigenteId
        ? `/detectados/dirigentes/${user.dirigenteId}`
        : "/login";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/detectados/${id}`);
      if (!res.ok) throw new Error("Detectado no encontrado");
      setDetectado((await res.json()) as DetectadoDTO);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!canLoad) return;
    void load();
  }, [load, canLoad]);

  async function handleSave(values: DetectadoFormValues) {
    const res = await apiFetch(`/api/detectados/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        segundoApellido: values.segundoApellido || null,
        telefonoCelular: values.telefonoCelular || null,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; detalles?: string[] };
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al guardar");
    }
    const updated = (await res.json()) as DetectadoDTO;
    const destino = updated.dirigenteId
      ? `/detectados/dirigentes/${updated.dirigenteId}`
      : "/detectados";
    router.push(destino);
    router.refresh();
  }

  async function toggleActivo(activo: boolean) {
    const url = activo
      ? `/api/detectados/${id}?reactivar=true`
      : `/api/detectados/${id}`;
    const res = await apiFetch(url, { method: "DELETE" });
    if (!res.ok) {
      alert("No se pudo actualizar el estado");
      return;
    }
    await load();
  }

  if (!canLoad) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando…
      </div>
    );
  }

  if (error || !detectado) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error ?? "No encontrado"}</div>
        <Link href="/detectados" className="btn-secondary btn-responsive">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">{detectado.nombreCompleto}</h1>
          <p className="page-subtitle">
            {etiquetaSeccion(detectado.seccionElectoral)}
            {detectado.dirigente ? (
              <>
                {" "}
                · Dirigente:{" "}
                <Link
                  href={`/detectados/dirigentes/${detectado.dirigenteId}`}
                  className="font-medium text-pin hover:underline"
                >
                  {detectado.dirigente.nombreCompleto}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="page-actions">
          <Link href={backHref} className="btn-ghost btn-responsive">
            Volver al listado
          </Link>
        </div>
      </div>

      {!detectado.activo ? (
        <p className="alert-warning">Este detectado está dado de baja.</p>
      ) : null}

      <div className="card max-w-sm text-center">
        <p className="text-2xl font-bold text-ink">{detectado.telefonoCelular ?? "—"}</p>
        <p className="text-xs text-ink-secondary">Celular</p>
      </div>

      <section className="card-section space-y-4">
        <h2 className="section-title">INE del detectado</h2>
        <div className="flex flex-wrap gap-4">
          <Image
            src={detectado.ineFrenteUrl}
            alt="INE anverso"
            width={320}
            height={200}
            className="max-w-xs rounded-pin object-contain ring-1 ring-line"
          />
          <Image
            src={detectado.ineReversoUrl}
            alt="INE reverso"
            width={320}
            height={200}
            className="max-w-xs rounded-pin object-contain ring-1 ring-line"
          />
        </div>
      </section>

      {isAdmin ? (
        <>
          <DetectadoForm
            key={detectado.updatedAt}
            initialValues={detectadoToFormValues(detectado)}
            onSubmit={handleSave}
            cancelHref={backHref}
            submitLabel="Guardar detectado"
            modo="editar"
            seccionFija={detectado.seccionElectoral}
          />

          <div className="flex justify-end">
            {detectado.activo ? (
              <button
                type="button"
                className="btn-danger btn-responsive"
                onClick={() => void toggleActivo(false)}
              >
                Dar de baja detectado
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary btn-responsive"
                onClick={() => void toggleActivo(true)}
              >
                Reactivar detectado
              </button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
