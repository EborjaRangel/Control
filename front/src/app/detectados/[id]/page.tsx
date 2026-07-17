"use client";

import { UploadImage } from "@/components/UploadImage";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DetectadoForm } from "@/components/DetectadoForm";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { detectadoToFormValues, type DetectadoDTO } from "@/lib/detectados";
import { canManageDetectadosDirigente } from "@/lib/mi-panel";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import type { DetectadoFormValues } from "@/lib/validation-detectado";

export default function DetectadoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isStaff, user } = useAuth();
  const [detectado, setDetectado] = useState<DetectadoDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canLoad = isStaff || Boolean(user?.dirigenteId);
  const canManage =
    isStaff ||
    (detectado?.dirigenteId
      ? canManageDetectadosDirigente(user, detectado.dirigenteId)
      : Boolean(user?.dirigenteId));

  const backHref = detectado?.dirigenteId
    ? isStaff
      ? `/detectados/dirigentes/${detectado.dirigenteId}`
      : `/detectados/dirigentes/${detectado.dirigenteId}`
    : isStaff
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
          {canManage && detectado.activo ? (
            <Link
              href={`/detectados/${id}/personas/nueva`}
              className="btn-primary btn-responsive"
            >
              + Registrar persona
            </Link>
          ) : null}
          <Link href={backHref} className="btn-ghost btn-responsive">
            Volver al listado
          </Link>
        </div>
      </div>

      {!detectado.activo ? (
        <p className="alert-warning">Este detectado está dado de baja.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card max-w-sm text-center">
          <p className="text-2xl font-bold text-ink">{detectado.telefonoCelular ?? "—"}</p>
          <p className="text-xs text-ink-secondary">Celular</p>
        </div>
        <div className="card max-w-sm text-center">
          <p className="text-2xl font-bold text-pin">{detectado.personasRegistradas}</p>
          <p className="text-xs text-ink-secondary">Personas registradas</p>
        </div>
      </div>

      <section className="card-section space-y-4">
        <h2 className="section-title">Credencial del detectado</h2>
        <div className="flex flex-wrap gap-4">
          <UploadImage
            src={detectado.ineFrenteUrl}
            alt="Credencial anverso"
            width={320}
            height={200}
            className="max-w-xs rounded-pin object-contain ring-1 ring-line"
          />
          <UploadImage
            src={detectado.ineReversoUrl}
            alt="Credencial reverso"
            width={320}
            height={200}
            className="max-w-xs rounded-pin object-contain ring-1 ring-line"
          />
        </div>
      </section>

      <section className="card-section space-y-4">
        <h2 className="section-title">Personas detectadas</h2>
        {(detectado.personas?.length ?? 0) === 0 ? (
          <p className="text-sm text-ink-secondary">
            {canManage ? (
              <>
                Aún no hay personas registradas.{" "}
                <Link
                  href={`/detectados/${id}/personas/nueva`}
                  className="font-medium text-pin hover:underline"
                >
                  Registrar la primera
                </Link>
              </>
            ) : (
              "Sin personas registradas."
            )}
          </p>
        ) : (
          <>
            <ul className="mobile-only-list">
              {(detectado.personas ?? []).map((persona) => (
                <li key={persona.id} className="list-card">
                  <div className="list-card-header">
                    <div className="min-w-0">
                      <Link
                        href={`/detectados/${id}/personas/${persona.id}`}
                        className="break-words font-bold text-pin hover:underline"
                      >
                        {persona.nombreCompleto}
                      </Link>
                      <p className="mt-1 text-xs text-ink-secondary">
                        {etiquetaSeccion(persona.seccionElectoral)} · {persona.colonia}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/detectados/${id}/personas/${persona.id}`}
                    className="btn-ghost btn-sm btn-responsive"
                  >
                    Ver / editar
                  </Link>
                </li>
              ))}
            </ul>

            <div className="desktop-only-table">
              <TableWrap>
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-ink-secondary">
                      <th className="py-2 pr-3">Persona</th>
                      <th className="py-2 pr-3">Sección</th>
                      <th className="py-2 pr-3">Colonia</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {(detectado.personas ?? []).map((persona) => (
                      <tr key={persona.id} className="border-b border-line/60">
                        <td className="py-2.5 pr-3">
                          <Link
                            href={`/detectados/${id}/personas/${persona.id}`}
                            className="font-medium text-pin hover:underline"
                          >
                            {persona.nombreCompleto}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3 text-ink-secondary">
                          {etiquetaSeccion(persona.seccionElectoral)}
                        </td>
                        <td className="py-2.5 pr-3 text-ink-secondary">{persona.colonia}</td>
                        <td className="py-2.5 text-right">
                          <Link
                            href={`/detectados/${id}/personas/${persona.id}`}
                            className="btn-ghost btn-sm"
                          >
                            Ver / editar
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          </>
        )}
      </section>

      {canManage ? (
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

          {isStaff ? (
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
          ) : null}
        </>
      ) : null}
    </div>
  );
}
