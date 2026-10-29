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
  campanaIdFiltro?: string;
  dirigenteId: string;
  onDirigenteIdChange: (dirigenteId: string, nombre?: string) => void;
  dirigenteNombreHint?: string;
  mapaCargando?: boolean;
};

function hrefDetalleRegistroAdmin(
  registro: RegistroDifusionDTO,
  dirigenteIdMapa: string,
  campanaIdFiltro?: string,
) {
  const params = new URLSearchParams({ from: "admin" });
  const dir = dirigenteIdMapa || registro.dirigenteId;
  if (dir) params.set("dirigenteId", dir);
  if (registro.dirigenteNombre) params.set("dirigenteNombre", registro.dirigenteNombre);
  const camp = campanaIdFiltro || registro.campanaId;
  if (camp) params.set("campanaId", camp);
  return `/difusion/registros/${registro.id}?${params.toString()}`;
}

export function DifusionAdminMapaSection({
  registros,
  titulo = "Mapa global de acciones",
  subtitulo = "Globos de todas las fotografías registradas por dirigentes.",
  campanaFiltroExtra,
  campanaIdFiltro,
  dirigenteId,
  onDirigenteIdChange,
  dirigenteNombreHint = "",
  mapaCargando = false,
}: Props) {
  const [busquedaSinFiltro, setBusquedaSinFiltro] = useState("");

  const dirigentes = useMemo(() => dirigentesUnicos(registros), [registros]);

  const nombreDirigenteActivo =
    dirigentes.find((d) => d.id === dirigenteId)?.nombre ??
    registros.find((r) => r.dirigenteId === dirigenteId)?.dirigenteNombre ??
    dirigenteNombreHint ||
    "";

  const busquedaMostrada = dirigenteId ? nombreDirigenteActivo : busquedaSinFiltro;

  const dirigentesFiltradosBusqueda = useMemo(() => {
    const q = normalizarBusqueda(busquedaMostrada);
    if (!q) return dirigentes;
    return dirigentes.filter((d) => normalizarBusqueda(d.nombre).includes(q));
  }, [dirigentes, busquedaMostrada]);

  const opcionesVerMapa = useMemo(() => {
    const list = [...dirigentesFiltradosBusqueda];
    if (dirigenteId && nombreDirigenteActivo && !list.some((d) => d.id === dirigenteId)) {
      list.push({ id: dirigenteId, nombre: nombreDirigenteActivo });
      list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    }
    return list;
  }, [dirigentesFiltradosBusqueda, dirigenteId, nombreDirigenteActivo]);

  const registrosMapa = useMemo(() => {
    if (!dirigenteId) return registros;
    return registros.filter((r) => r.dirigenteId === dirigenteId);
  }, [registros, dirigenteId]);

  const mostrarNumeros = Boolean(dirigenteId);

  function elegirDirigentePorNombre(nombreEscrito: string) {
    const q = normalizarBusqueda(nombreEscrito);
    if (!q) {
      onDirigenteIdChange("");
      setBusquedaSinFiltro("");
      return;
    }
    const match =
      dirigentes.find((d) => normalizarBusqueda(d.nombre) === q) ??
      dirigentes.find((d) => normalizarBusqueda(d.nombre).includes(q));
    if (match) {
      onDirigenteIdChange(match.id, match.nombre);
    }
  }

  return (
    <section className="card-section space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 shrink-0 lg:max-w-md">
          <h2 className="section-title">{titulo}</h2>
          <p className="text-sm text-ink-secondary">{subtitulo}</p>
        </div>
        <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 lg:max-w-3xl lg:flex-1 xl:grid-cols-3">
          {campanaFiltroExtra}
          <label className="flex min-w-0 flex-col gap-1 sm:col-span-2 xl:col-span-1">
            <span className="label">Buscar dirigente</span>
            <input
              type="search"
              className="input"
              placeholder="Nombre o apellido…"
              value={busquedaMostrada}
              onChange={(e) => {
                const v = e.target.value;
                if (dirigenteId) {
                  onDirigenteIdChange("");
                }
                setBusquedaSinFiltro(v);
              }}
              onBlur={() => {
                if (!dirigenteId) elegirDirigentePorNombre(busquedaSinFiltro);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (dirigenteId) return;
                  elegirDirigentePorNombre(busquedaSinFiltro);
                }
              }}
              list="difusion-dirigentes-list"
            />
            <datalist id="difusion-dirigentes-list">
              {dirigentes.map((d) => (
                <option key={d.id} value={d.nombre} />
              ))}
            </datalist>
          </label>
          <label className="flex min-w-0 flex-col gap-1 sm:col-span-2 xl:col-span-1">
            <span className="label">Ver mapa</span>
            <select
              className="input"
              value={dirigenteId}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) {
                  onDirigenteIdChange("");
                  setBusquedaSinFiltro("");
                  return;
                }
                const d = opcionesVerMapa.find((x) => x.id === id) ?? dirigentes.find((x) => x.id === id);
                onDirigenteIdChange(id, d?.nombre);
              }}
            >
              <option value="">Todos (sin número en globo)</option>
              {opcionesVerMapa.map((d) => (
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
          <span className="font-semibold text-ink">{nombreDirigenteActivo || "dirigente"}</span>
          . Los globos llevan el número de acción (1…N) en cada campaña.
        </p>
      ) : (
        <p className="text-sm text-ink-secondary">
          Vista general: {mapaCargando ? "…" : registros.length} acción(es). Elige un dirigente para ver numeración
          por campaña.
        </p>
      )}

      {mapaCargando ? (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-8 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando acciones en mapa…
        </div>
      ) : (
        <DifusionMapaAcciones
          registros={registrosMapa}
          mostrarNumerosGlobo={mostrarNumeros}
          detalleHref={(r) => hrefDetalleRegistroAdmin(r, dirigenteId, campanaIdFiltro)}
        />
      )}
    </section>
  );
}
