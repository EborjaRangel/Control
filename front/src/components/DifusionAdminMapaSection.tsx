"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DifusionMapaAcciones } from "@/components/DifusionMapaAcciones";
import type { RegistroDifusionDTO } from "@/lib/difusion";

type DirigenteOpcion = { id: string; nombre: string };

function normalizarBusqueda(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function dirigentesUnicos(registros: RegistroDifusionDTO[]): DirigenteOpcion[] {
  const map = new Map<string, string>();
  for (const r of registros) {
    if (r.dirigenteId && r.dirigenteNombre) {
      map.set(r.dirigenteId, r.dirigenteNombre);
    }
  }
  return [...map.entries()]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

type Props = {
  registros: RegistroDifusionDTO[];
  titulo?: string;
  subtitulo?: string;
  campanaFiltroExtra?: ReactNode;
};

export function DifusionAdminMapaSection({
  registros,
  titulo = "Mapa global de acciones",
  subtitulo = "Globos de todas las fotografías registradas por dirigentes.",
  campanaFiltroExtra,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [dirigenteId, setDirigenteId] = useState("");

  const dirigentes = useMemo(() => dirigentesUnicos(registros), [registros]);

  const dirigentesFiltrados = useMemo(() => {
    const q = normalizarBusqueda(busqueda);
    if (!q) return dirigentes;
    return dirigentes.filter((d) => normalizarBusqueda(d.nombre).includes(q));
  }, [dirigentes, busqueda]);

  const registrosMapa = useMemo(() => {
    if (!dirigenteId) return registros;
    return registros.filter((r) => r.dirigenteId === dirigenteId);
  }, [registros, dirigenteId]);

  const mostrarNumeros = Boolean(dirigenteId);

  return (
    <section className="card-section space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="section-title">{titulo}</h2>
          <p className="text-sm text-ink-secondary">{subtitulo}</p>
        </div>
        <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
          {campanaFiltroExtra}
          <label className="block min-w-0 flex-1">
            <span className="label">Buscar dirigente</span>
            <input
              type="search"
              className="input mt-1"
              placeholder="Nombre o apellido…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              list="difusion-dirigentes-list"
            />
            <datalist id="difusion-dirigentes-list">
              {dirigentesFiltrados.map((d) => (
                <option key={d.id} value={d.nombre} />
              ))}
            </datalist>
          </label>
          <label className="block min-w-[12rem]">
            <span className="label">Ver mapa</span>
            <select
              className="input mt-1"
              value={dirigenteId}
              onChange={(e) => setDirigenteId(e.target.value)}
            >
              <option value="">Todos (sin número en globo)</option>
              {dirigentesFiltrados.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {dirigenteId ? (
        <p className="text-sm text-ink-secondary">
          Mostrando acciones de{" "}
          <span className="font-semibold text-ink">
            {dirigentes.find((d) => d.id === dirigenteId)?.nombre ?? "dirigente"}
          </span>
          . Los globos llevan el número de acción (1…N) en cada campaña.
        </p>
      ) : (
        <p className="text-sm text-ink-secondary">
          Vista general: {registros.length} acción(es). Elige un dirigente para ver numeración por campaña.
        </p>
      )}

      <DifusionMapaAcciones
        registros={registrosMapa}
        mostrarNumerosGlobo={mostrarNumeros}
        detalleHref={(r) => `/difusion/registros/${r.id}`}
      />
    </section>
  );
}
