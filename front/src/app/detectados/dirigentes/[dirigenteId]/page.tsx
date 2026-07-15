"use client";

import Link from "next/link";
import { Form, Formik } from "formik";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { FormField } from "@/components/FormField";
import { apiFetch } from "@/lib/api";
import { canManageDetectadosDirigente, canViewOwnDirigente } from "@/lib/mi-panel";
import { TIPO_DIRIGENTE_LABEL } from "@/lib/dirigentes";
import type { DirigenteDetectadosPanelDTO } from "@/lib/detectados";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import * as Yup from "yup";

const metaSchema = Yup.object({
  metaDetectados: Yup.number()
    .transform((_value, originalValue) => {
      if (originalValue === "" || originalValue == null) return 0;
      const n = Number(originalValue);
      return Number.isNaN(n) ? originalValue : n;
    })
    .typeError("Meta inválida")
    .integer("Debe ser un número entero")
    .min(0, "No puede ser negativa")
    .required("Indica la meta de detectados"),
});

export default function DirigenteDetectadosPage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const { isStaff, user } = useAuth();
  const canAccess = isStaff || canViewOwnDirigente(user, dirigenteId);
  const canCreate = isStaff || canManageDetectadosDirigente(user, dirigenteId);
  const [panel, setPanel] = useState<DirigenteDetectadosPanelDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/detectados/dirigentes/${dirigenteId}`);
      if (!res.ok) throw new Error("Dirigente no encontrado");
      setPanel((await res.json()) as DirigenteDetectadosPanelDTO);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [dirigenteId]);

  useEffect(() => {
    if (!canAccess) return;
    void load();
  }, [load, canAccess]);

  async function handleSaveMeta(metaDetectados: number) {
    setSaveError(null);
    setSaved(false);
    const res = await apiFetch(`/api/detectados/dirigentes/${dirigenteId}/meta`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metaDetectados }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; detalles?: string[] };
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al guardar");
    }
    const dirigente = (await res.json()) as DirigenteDetectadosPanelDTO["dirigente"];
    setPanel((prev) => (prev ? { ...prev, dirigente } : prev));
    setSaved(true);
  }

  if (!canAccess) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando…
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error ?? "No encontrado"}</div>
        <Link href="/detectados" className="btn-secondary btn-responsive">
          Volver a detectados
        </Link>
      </div>
    );
  }

  const d = panel.dirigente;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">{d.nombreCompleto}</h1>
          <p className="page-subtitle">
            {TIPO_DIRIGENTE_LABEL[d.tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ?? d.tipo} ·{" "}
            {d.colonia} · {etiquetaSeccion(d.seccionElectoral)}
          </p>
        </div>
        <div className="page-actions">
          {canCreate ? (
            <Link
              href={`/detectados/dirigentes/${dirigenteId}/nuevo`}
              className="btn-primary btn-responsive"
            >
              + Nuevo detectado
            </Link>
          ) : null}
          {isStaff ? (
            <Link href="/detectados" className="btn-ghost btn-responsive">
              Volver a dirigentes
            </Link>
          ) : user?.dirigenteId ? (
            <Link
              href={`/dirigentes/${user.dirigenteId}/consultar`}
              className="btn-ghost btn-responsive"
            >
              Volver a mi ficha
            </Link>
          ) : null}
        </div>
      </div>

      {!d.activo ? (
        <p className="alert-warning">Este dirigente está dado de baja.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-pin">{d.detectadosAsignados}</p>
          <p className="text-xs text-ink-secondary">Detectados</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-ink">{d.metaDetectados}</p>
          <p className="text-xs text-ink-secondary">Meta de detectados</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-success-text">{d.avancePct}%</p>
          <p className="text-xs text-ink-secondary">Avance</p>
        </div>
      </div>

      {saved ? (
        <div className="alert-success">Meta de detectados actualizada.</div>
      ) : null}
      {saveError ? <div className="alert-error">{saveError}</div> : null}

      {isStaff ? (
        <Formik
          initialValues={{ metaDetectados: d.metaDetectados }}
          validationSchema={metaSchema}
          enableReinitialize
          onSubmit={async (values, { setSubmitting }) => {
            setSaveError(null);
            try {
              await handleSaveMeta(values.metaDetectados);
            } catch (err) {
              setSaveError(err instanceof Error ? err.message : "Error al guardar");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="card-section space-y-4">
              <div>
                <h2 className="section-title">Meta de detectados</h2>
                <p className="mt-1 text-sm text-ink-secondary">
                  Cuántos operadores de detección debe tener asignados este dirigente.
                </p>
              </div>
              <FormField
                label="Meta de detectados"
                name="metaDetectados"
                type="number"
                min={0}
                step={1}
              />
              <div className="divider flex justify-end pt-2">
                <button
                  type="submit"
                  className="btn-primary btn-responsive"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Guardando…" : "Guardar meta"}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      ) : (
        <section className="card-section">
          <h2 className="section-title">Meta de detectados</h2>
          <p className="mt-2 text-2xl font-bold text-pin">{d.metaDetectados}</p>
        </section>
      )}

      <section className="card-section space-y-4">
        <h2 className="section-title">Detectados</h2>
        {panel.detectados.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            {canCreate ? (
              <>
                {isStaff ? "Este dirigente" : "Aún no tienes"} detectados asignados.{" "}
                <Link
                  href={`/detectados/dirigentes/${dirigenteId}/nuevo`}
                  className="font-medium text-pin hover:underline"
                >
                  Crear el primero
                </Link>
              </>
            ) : (
              "Aún no tienes detectados asignados."
            )}
          </p>
        ) : (
          <>
            <ul className="mobile-only-list">
              {panel.detectados.map((det) => (
                <li key={det.id} className="list-card">
                  <div className="list-card-header">
                    <div className="min-w-0">
                      <Link
                        href={`/detectados/${det.id}`}
                        className="break-words font-bold text-pin hover:underline"
                      >
                        {det.nombreCompleto}
                      </Link>
                      <p className="mt-1 text-xs text-ink-secondary">
                        {etiquetaSeccion(det.seccionElectoral)}
                      </p>
                    </div>
                  </div>
                  <Link href={`/detectados/${det.id}`} className="btn-ghost btn-sm btn-responsive">
                    Ver detalle
                  </Link>
                </li>
              ))}
            </ul>

            <div className="desktop-only-table">
              <TableWrap>
                <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-secondary">
                  <th className="py-2 pr-3">Detectado</th>
                  <th className="py-2 pr-3">Sección</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {panel.detectados.map((det) => (
                  <tr key={det.id} className="border-b border-line/60">
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/detectados/${det.id}`}
                        className="font-medium text-pin hover:underline"
                      >
                        {det.nombreCompleto}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-secondary">
                      {etiquetaSeccion(det.seccionElectoral)}
                    </td>
                    <td className="py-2.5 text-right">
                      <Link href={`/detectados/${det.id}`} className="btn-ghost btn-sm">
                        Ver detalle
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
    </div>
  );
}
