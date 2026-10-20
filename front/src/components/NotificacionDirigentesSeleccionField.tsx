"use client";

import { useFormikContext } from "formik";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  TIPO_DIRIGENTE_LABEL,
  TIPOS_DIRIGENTE,
  compararDirigentePorApellidosNombre,
  etiquetaApellidosNombre,
} from "@/lib/dirigentes";
import type { DirigenteDTO } from "@/lib/types";
import type { NotificacionFormValues } from "@/lib/validation-notificacion";

export function NotificacionDirigentesSeleccionField() {
  const { values, setFieldValue, errors, touched, submitCount } = useFormikContext<NotificacionFormValues>();
  const [dirigentes, setDirigentes] = useState<DirigenteDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    if (values.alcance !== "DIRIGENTES_SELECCION") return;
    setLoading(true);
    void apiFetch("/api/dirigentes?orden=apellidos")
      .then(async (res) => (res.ok ? ((await res.json()) as DirigenteDTO[]) : []))
      .then((list) => setDirigentes(list.filter((d) => d.activo)))
      .catch(() => setDirigentes([]))
      .finally(() => setLoading(false));
  }, [values.alcance]);

  const grupos = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    const filtrados = q
      ? dirigentes.filter((d) => etiquetaApellidosNombre(d).toLowerCase().includes(q))
      : dirigentes;

    return TIPOS_DIRIGENTE.map((tipo) => ({
      tipo,
      label: TIPO_DIRIGENTE_LABEL[tipo],
      items: filtrados.filter((d) => d.tipo === tipo).sort(compararDirigentePorApellidosNombre),
    })).filter((g) => g.items.length > 0);
  }, [dirigentes, buscar]);

  const seleccionados = values.dirigenteIds ?? [];
  const showError = Boolean(errors.dirigenteIds && (touched.dirigenteIds || submitCount > 0));

  function toggle(id: string, checked: boolean) {
    const next = checked ? [...seleccionados, id] : seleccionados.filter((x) => x !== id);
    void setFieldValue("dirigenteIds", next);
  }

  function toggleGrupo(ids: string[], marcar: boolean) {
    const set = new Set(seleccionados);
    for (const id of ids) {
      if (marcar) set.add(id);
      else set.delete(id);
    }
    void setFieldValue("dirigenteIds", [...set]);
  }

  if (values.alcance !== "DIRIGENTES_SELECCION") return null;

  return (
    <div className="sm:col-span-2 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="label mb-0">Dirigentes en alcance</span>
        <p className="text-xs text-ink-secondary">
          {seleccionados.length} seleccionado(s)
        </p>
      </div>

      <input
        type="search"
        className="input"
        placeholder="Buscar por nombre o apellido…"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
      />

      {loading ? (
        <p className="text-sm text-ink-secondary">Cargando dirigentes…</p>
      ) : (
        <div className="max-h-[min(420px,50vh)] space-y-4 overflow-y-auto rounded-pin border border-line bg-surface-muted/40 p-3">
          {grupos.map((grupo) => {
            const idsGrupo = grupo.items.map((d) => d.id);
            const todosMarcados = idsGrupo.every((id) => seleccionados.includes(id));
            return (
              <section key={grupo.tipo} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-1">
                  <h4 className="text-sm font-bold text-pin-dark">{grupo.label}</h4>
                  <button
                    type="button"
                    className="text-xs font-semibold text-pin hover:text-pin-hover"
                    onClick={() => toggleGrupo(idsGrupo, !todosMarcados)}
                  >
                    {todosMarcados ? "Quitar todos" : "Marcar todos"}
                  </button>
                </div>
                <ul className="space-y-1">
                  {grupo.items.map((d) => (
                    <li key={d.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-surface-soft">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 shrink-0 accent-pin"
                          checked={seleccionados.includes(d.id)}
                          onChange={(e) => toggle(d.id, e.target.checked)}
                        />
                        <span className="text-sm text-ink">{etiquetaApellidosNombre(d)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {!grupos.length ? (
            <p className="text-sm text-ink-secondary">No hay dirigentes que coincidan.</p>
          ) : null}
        </div>
      )}

      {showError ? <p className="field-error">{String(errors.dirigenteIds)}</p> : null}
    </div>
  );
}
