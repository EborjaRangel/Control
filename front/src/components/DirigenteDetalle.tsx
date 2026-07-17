"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { UploadImage } from "@/components/UploadImage";
import Link from "next/link";
import { SueldoDesglose } from "@/components/SueldoDesglose";
import {
  etiquetaConceptoComposicion,
  formatMxn,
  nombreCompleto,
  TIPO_DIRIGENTE_LABEL,
  type TipoDirigente,
} from "@/lib/dirigentes";
import { STATUS_DIRIGENTE_LABEL } from "@/lib/dirigente-spec";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import { etiquetaUnidadTerritorial } from "@/lib/unidades-territoriales";
import type { DirigenteDTO } from "@/lib/types";
import { DirigenteQrCard } from "@/components/DirigenteQrCard";

const SeccionElectoralMap = dynamic(
  () => import("@/components/SeccionElectoralMap").then((m) => m.SeccionElectoralMap),
  {
    ssr: false,
    loading: () => (
      <div className="panel-soft flex min-h-[220px] items-center justify-center text-sm text-ink-secondary sm:min-h-[280px]">
        Cargando mapa…
      </div>
    ),
  },
);

type Props = {
  dirigente: DirigenteDTO;
  editHref?: string;
  nominaHref?: string;
  backHref?: string;
  showComposicionSueldo?: boolean;
};

function formatFecha(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function Campo({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="label">{label}</dt>
      <dd className="break-anywhere mt-1 text-sm font-medium text-ink">{value || "—"}</dd>
    </div>
  );
}

export function DirigenteDetalle({
  dirigente: d,
  editHref,
  nominaHref,
  backHref = "/",
  showComposicionSueldo = true,
}: Props) {
  const direccion = [
    d.calle,
    d.numeroExterior,
    d.numeroInterior ? `Int. ${d.numeroInterior}` : null,
    d.colonia,
    `C.P. ${d.codigoPostal}`,
    "Coyoacán, CDMX",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {d.fotoUrl ? (
            <UploadImage
              src={d.fotoUrl}
              alt=""
              width={96}
              height={96}
              className="size-24 shrink-0 rounded-full object-cover ring-2 ring-pin-light shadow-pin"
            />
          ) : (
            <div className="flex size-24 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line bg-surface-muted text-sm font-medium text-ink-secondary">
              Sin foto
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="page-title break-words">{nombreCompleto(d)}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="badge-pin">
                {TIPO_DIRIGENTE_LABEL[d.tipo as TipoDirigente] ?? d.tipo}
              </span>
              {!d.activo ? <span className="badge-muted">Baja</span> : null}
              <span className="badge-muted">{STATUS_DIRIGENTE_LABEL[d.status] ?? d.status}</span>
            </div>
          </div>
        </div>
        <div className="page-actions">
          {nominaHref ? (
            <Link href={nominaHref} className="btn-primary btn-responsive">
              Ver nómina
            </Link>
          ) : null}
          {editHref ? (
            <Link href={editHref} className="btn-secondary btn-responsive">
              Editar
            </Link>
          ) : null}
          {backHref ? (
            <Link href={backHref} className="btn-ghost btn-responsive">
              Volver al listado
            </Link>
          ) : null}
        </div>
      </div>

      {!d.activo ? (
        <p className="alert-warning">Este dirigente está dado de baja.</p>
      ) : null}

      <section className="card-section space-y-4">
        <h2 className="section-title">Datos personales</h2>
        <dl className="grid gap-4 form-grid">
          <Campo label="Nombre(s)" value={d.nombre} />
          <Campo label="Primer apellido" value={d.primerApellido} />
          <Campo label="Segundo apellido" value={d.segundoApellido} />
          <Campo label="Fecha de nacimiento" value={formatFecha(d.fechaNacimiento)} />
          <Campo label="Celular" value={d.telefonoCelular} />
          <Campo label="Correo electrónico" value={d.correo} />
          <Campo label="Alias" value={d.alias} />
          <Campo label="CURP" value={d.curp} />
          <Campo label="Credencial de elector" value={d.tieneIne ? "Sí" : "No"} />
          {d.usuario ? <Campo label="Usuario de acceso" value={d.usuario} /> : null}
          {d.password ? <Campo label="Contraseña de acceso" value={d.password} /> : null}
        </dl>
      </section>

      {d.tieneIne && (d.ineFrenteUrl || d.ineReversoUrl) ? (
        <section className="card-section space-y-4">
          <h2 className="section-title">Credencial de elector</h2>
          <div className="flex flex-wrap gap-4">
            {d.ineFrenteUrl ? (
              <UploadImage
                src={d.ineFrenteUrl}
                alt="Credencial frente"
                width={160}
                height={100}
                className="h-24 w-40 rounded-pin object-cover ring-2 ring-pin-light"
              />
            ) : null}
            {d.ineReversoUrl ? (
              <UploadImage
                src={d.ineReversoUrl}
                alt="Credencial reverso"
                width={160}
                height={100}
                className="h-24 w-40 rounded-pin object-cover ring-2 ring-pin-light"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="card-section space-y-4">
        <h2 className="section-title">Perfil político</h2>
        <dl className="grid gap-4 form-grid">
          <Campo label="Filiación" value={d.filiacion} />
          <Campo
            label="Referente"
            value={d.referente ? nombreCompleto(d.referente) : null}
          />
          <Campo label="Aspiración a corto plazo" value={d.aspiracionCortoPlazo} />
          <Campo label="Aspiración a largo plazo" value={d.aspiracionLargoPlazo} />
          <Campo label="Antecedentes políticos / sociales" value={d.antecedentesPoliticos} />
          <Campo label="Notas de la coordinación" value={d.notasCoordinacion} />
        </dl>
      </section>

      {d.codigoQr ? (
        <DirigenteQrCard
          codigoQr={d.codigoQr}
          qrPayload={d.qrPayload}
          nombre={d.nombre}
          primerApellido={d.primerApellido}
          segundoApellido={d.segundoApellido}
          fechaNacimiento={d.fechaNacimiento}
        />
      ) : null}

      <section className="card-section space-y-4">
        <h2 className="section-title">Clasificación electoral</h2>
        <dl className="grid gap-4 form-grid">
          <Campo
            label="Tipo de dirigente"
            value={TIPO_DIRIGENTE_LABEL[d.tipo as TipoDirigente] ?? d.tipo}
          />
          <Campo label="Sección electoral" value={etiquetaSeccion(d.seccionElectoral)} />
          <Campo label="Distrito federal" value={d.distritoFederal} />
          <Campo label="Distrito local" value={d.distritoLocal} />
          {d.unidadTerritorial ? (
            <Campo
              label="Unidad territorial (IECM)"
              value={etiquetaUnidadTerritorial(d.unidadTerritorial)}
            />
          ) : null}
        </dl>
        {d.seccionElectoral ? (
          <SeccionElectoralMap seccion={d.seccionElectoral} colonia={d.colonia || undefined} />
        ) : null}
      </section>

      <section className="card-section space-y-4">
        <h2 className="section-title">Dirección</h2>
        <Campo label="Domicilio" value={direccion} />
        <dl className="mt-4 grid gap-4 form-grid">
          <Campo label="Alcaldía" value={d.alcaldia} />
          <Campo label="Estado" value={d.estadoRepublica} />
        </dl>
      </section>

      {(d.estudios?.length ?? 0) > 0 ? (
        <section className="card-section space-y-4">
          <h2 className="section-title">Estudios y habilidades</h2>
          <ul className="space-y-2 text-sm">
            {d.estudios.map((e) => (
              <li key={e.id} className="panel-soft p-3">
                <p className="font-medium text-ink">{e.descripcion}</p>
                {e.institucion ? <p className="text-ink-secondary">{e.institucion}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(d.redesSociales?.length ?? 0) > 0 ? (
        <section className="card-section space-y-4">
          <h2 className="section-title">Redes sociales</h2>
          <ul className="space-y-2 text-sm">
            {d.redesSociales.map((r) => (
              <li key={r.id}>
                <span className="font-medium">{r.descripcion}:</span> {r.cuenta}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(d.contactosEmergencia?.length ?? 0) > 0 ? (
        <section className="card-section space-y-4">
          <h2 className="section-title">Contactos de emergencia</h2>
          <ul className="space-y-2 text-sm">
            {d.contactosEmergencia.map((c) => (
              <li key={c.id}>
                {c.nombre} ({c.parentesco}) — {c.telefono}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(d.ingresos?.length ?? 0) > 0 ? (
        <section className="card-section space-y-4">
          <h2 className="section-title">Otra actividad económica</h2>
          <ul className="space-y-2 text-sm">
            {d.ingresos.map((i) => (
              <li key={i.id} className="panel-soft p-3">
                {i.tipoIngreso}
                {i.monto > 0 ? ` · ${formatMxn(i.monto)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showComposicionSueldo ? (
      <section className="card-section space-y-4">
        <h2 className="section-title">Composición del sueldo</h2>

        {(d.conceptosComposicion?.length ?? 0) > 0 ? (
          <ul className="space-y-2">
            {d.conceptosComposicion.map((c) => (
              <li
                key={c.id}
                className="panel-soft flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="font-medium text-ink">
                  {etiquetaConceptoComposicion(c)}
                </span>
                <span className="text-ink-secondary">{formatMxn(c.monto)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-secondary">Sin conceptos registrados.</p>
        )}

        <SueldoDesglose desglose={d.desglose} />
      </section>
      ) : null}
    </div>
  );
}
