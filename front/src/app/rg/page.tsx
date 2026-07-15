"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import type { RgDTO } from "@/lib/rc-rg";

export default function RgPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { isStaff, user } = useAuth();
  const [lista, setLista] = useState<RgDTO[]>([]);
  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (buscar.trim()) params.set("buscar", buscar.trim());
      const res = await apiFetch(`/api/rg?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar Rep. General");
      const data = (await res.json()) as RgDTO[];
      setLista(data);
      if (user?.rol === "RG" && data[0]) {
        router.replace(`/rg/${data[0].id}`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [buscar, user?.rol, router]);

  useEffect(() => {
    const t = setTimeout(() => void load(), buscar ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, buscar, pathname]);

  if (user?.rol === "RG") {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando panel…
      </div>
    );
  }
  if (!isStaff) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rep. General</h1>
          <p className="page-subtitle">Registro de representantes de casilla</p>
        </div>
        <Link href="/rg/nuevo" className="btn-primary btn-responsive">
          + Nuevo Rep. General
        </Link>
      </div>

      <div className="card">
        <label className="block w-full">
          <span className="label">Buscar</span>
          <input
            type="search"
            className="input mt-1 input-search"
            placeholder="Buscar por nombre…"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </label>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {loading ? (
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando…
        </div>
      ) : null}

      {!loading && lista.length === 0 ? (
        <p className="card py-8 text-center text-sm text-ink-secondary">Sin registros.</p>
      ) : null}

      {!loading && lista.length > 0 ? (
        <>
          <ul className="mobile-only-list">
            {lista.map((r) => (
              <li key={r.id} className="list-card-interactive">
                <Link href={`/rg/${r.id}`} className="list-card-header">
                  <div className="min-w-0">
                    <p className="break-words font-bold text-ink">{r.nombreCompleto}</p>
                    <p className="mt-1 text-xs text-ink-secondary">Rep. General</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-pin">{r.representantesRegistrados}</p>
                    <p className="text-[10px] text-ink-secondary">representantes</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="card-section desktop-only-table">
            <TableWrap>
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-secondary">
                    <th className="py-2 pr-3">Rep. General</th>
                    <th className="py-2 pr-3 text-center">Representantes</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((r) => (
                    <tr key={r.id} className="border-b border-line/60">
                      <td className="py-2.5 pr-3">
                        <Link href={`/rg/${r.id}`} className="font-medium text-pin hover:underline">
                          {r.nombreCompleto}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-center font-semibold">
                        {r.representantesRegistrados}
                      </td>
                      <td className="py-2.5 text-right">
                        <Link href={`/rg/${r.id}`} className="btn-ghost btn-sm">
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>
        </>
      ) : null}
    </div>
  );
}
