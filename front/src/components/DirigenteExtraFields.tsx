"use client";

import { FieldArray, useFormikContext } from "formik";
import { useEffect, useState } from "react";
import { FormCheckbox, FormField, FormSelect } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import {
  FILIACIONES_PARTIDO,
  PARENTESCOS_EMERGENCIA,
  TIPOS_RED_SOCIAL,
} from "@/lib/dirigente-spec";
import { apiFetch } from "@/lib/api";
import { nombreCompleto } from "@/lib/dirigentes";
import {
  DISTRITOS_FEDERALES_COYOACAN,
  DISTRITOS_LOCALES_COYOACAN,
} from "@/lib/secciones-electorales";
import type { DirigenteDTO } from "@/lib/types";
import type { DirigenteFormValues } from "@/lib/validation";

type Props = {
  excludeReferenteId?: string;
};

function ReferenteSelect({ excludeReferenteId }: { excludeReferenteId?: string }) {
  const [dirigentes, setDirigentes] = useState<DirigenteDTO[]>([]);

  useEffect(() => {
    void apiFetch("/api/dirigentes")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as DirigenteDTO[];
      })
      .then((list) => setDirigentes(list.filter((d) => d.id !== excludeReferenteId && d.activo)))
      .catch(() => setDirigentes([]));
  }, [excludeReferenteId]);

  return (
    <FormSelect label="Referente (dirigente que lo acercó)" name="referenteId">
      <option value="">Sin referente</option>
      {dirigentes.map((d) => (
        <option key={d.id} value={d.id}>
          {nombreCompleto(d)}
        </option>
      ))}
    </FormSelect>
  );
}

export function DirigenteExtraFields({ excludeReferenteId }: Props) {
  const { values } = useFormikContext<DirigenteFormValues>();

  return (
    <>
      <section className="card-section space-y-4">
        <h2 className="section-title">Identificación</h2>
        <div className="grid gap-4 form-grid">
          <FormField label="Alias" name="alias" className="sm:col-span-2" />
          <FormField label="CURP" name="curp" className="sm:col-span-2" />
          <FormCheckbox label="Cuenta con credencial de elector" name="tieneIne" />
        </div>
        {values.tieneIne ? (
          <div className="grid gap-4 form-grid sm:grid-cols-2">
            <ImageUploadField name="ineFrenteUrl" label="Credencial — frente" previewAlt="Credencial frente" />
            <ImageUploadField name="ineReversoUrl" label="Credencial — reverso" previewAlt="Credencial reverso" />
          </div>
        ) : null}
      </section>

      <section className="card-section space-y-4">
        <h2 className="section-title">Perfil político</h2>
        <div className="grid gap-4 form-grid">
          <FormSelect label="Filiación partidista" name="filiacion">
            <option value="">Sin filiación</option>
            {FILIACIONES_PARTIDO.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </FormSelect>
          <ReferenteSelect excludeReferenteId={excludeReferenteId} />
          <FormField
            label="Aspiración a corto plazo"
            name="aspiracionCortoPlazo"
            className="sm:col-span-2"
          />
          <FormField
            label="Aspiración a largo plazo"
            name="aspiracionLargoPlazo"
            className="sm:col-span-2"
          />
          <FormField
            label="Antecedentes políticos / sociales"
            name="antecedentesPoliticos"
            className="sm:col-span-2"
          />
          <FormField
            label="Notas de la coordinación"
            name="notasCoordinacion"
            className="sm:col-span-2"
          />
        </div>
      </section>

      <section className="card-section space-y-4">
        <h2 className="section-title">Distritos electorales</h2>
        <div className="grid gap-4 form-grid">
          <FormSelect label="Distrito federal" name="distritoFederal">
            <option value="">Seleccionar…</option>
            {DISTRITOS_FEDERALES_COYOACAN.map((d) => (
              <option key={d} value={d}>
                Distrito federal {d}
              </option>
            ))}
          </FormSelect>
          <FormSelect label="Distrito local" name="distritoLocal">
            <option value="">Seleccionar…</option>
            {DISTRITOS_LOCALES_COYOACAN.map((d) => (
              <option key={d} value={d}>
                Distrito local {d}
              </option>
            ))}
          </FormSelect>
          <p className="text-xs text-ink-secondary sm:col-span-2">
            Distritos electorales de Coyoacán: 26 o 30. Si el registro venía del Excel con otro
            número, elige el distrito local correcto.
          </p>
          <FormField label="Alcaldía" name="alcaldia" readOnly />
          <FormField label="Estado" name="estadoRepublica" readOnly />
        </div>
      </section>

      <section className="card-section space-y-4">
        <h2 className="section-title">Estudios, oficios y habilidades</h2>
        <FieldArray name="estudios">
          {({ push, remove }) => (
            <>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() =>
                  push({
                    descripcion: "",
                    institucion: "",
                    anioEgreso: undefined,
                    cedula: "",
                    certificado: false,
                    otros: "",
                  })
                }
              >
                + Agregar estudio u oficio
              </button>
              <div className="space-y-3">
                {(values.estudios ?? []).map((_, index) => (
                  <div key={index} className="panel-soft grid gap-3 form-grid">
                    <FormField label="Descripción" name={`estudios.${index}.descripcion`} />
                    <FormField label="Institución" name={`estudios.${index}.institucion`} />
                    <FormField
                      label="Año de egreso"
                      name={`estudios.${index}.anioEgreso`}
                      type="number"
                    />
                    <FormField label="Cédula" name={`estudios.${index}.cedula`} />
                    <FormCheckbox label="Cuenta con certificado" name={`estudios.${index}.certificado`} />
                    <FormField label="Otros" name={`estudios.${index}.otros`} className="sm:col-span-2" />
                    <button type="button" className="btn-danger btn-sm" onClick={() => remove(index)}>
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </FieldArray>
      </section>

      <section className="card-section space-y-4">
        <h2 className="section-title">Redes sociales</h2>
        <FieldArray name="redesSociales">
          {({ push, remove }) => (
            <>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => push({ descripcion: TIPOS_RED_SOCIAL[0], cuenta: "" })}
              >
                + Agregar red social
              </button>
              <div className="space-y-3">
                {(values.redesSociales ?? []).map((_, index) => (
                  <div key={index} className="panel-soft grid gap-3 form-grid sm:grid-cols-2">
                    <FormSelect label="Tipo" name={`redesSociales.${index}.descripcion`}>
                      {TIPOS_RED_SOCIAL.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </FormSelect>
                    <FormField label="Cuenta / enlace" name={`redesSociales.${index}.cuenta`} />
                    <button type="button" className="btn-danger btn-sm" onClick={() => remove(index)}>
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </FieldArray>
      </section>

      <section className="card-section space-y-4">
        <h2 className="section-title">Contactos de emergencia</h2>
        <FieldArray name="contactosEmergencia">
          {({ push, remove }) => (
            <>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => push({ nombre: "", parentesco: PARENTESCOS_EMERGENCIA[0], telefono: "" })}
              >
                + Agregar contacto
              </button>
              <div className="space-y-3">
                {(values.contactosEmergencia ?? []).map((_, index) => (
                  <div key={index} className="panel-soft grid gap-3 form-grid sm:grid-cols-2">
                    <FormField label="Nombre" name={`contactosEmergencia.${index}.nombre`} />
                    <FormSelect label="Parentesco" name={`contactosEmergencia.${index}.parentesco`}>
                      {PARENTESCOS_EMERGENCIA.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </FormSelect>
                    <FormField label="Teléfono" name={`contactosEmergencia.${index}.telefono`} />
                    <button type="button" className="btn-danger btn-sm" onClick={() => remove(index)}>
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </FieldArray>
      </section>

      <section className="card-section space-y-4">
        <div>
          <h2 className="section-title">Otra actividad económica</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Registra si el dirigente tiene ingresos por alguna actividad distinta a la nómina.
          </p>
        </div>
        <FieldArray name="ingresos">
          {({ push, remove }) => (
            <>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() =>
                  push({
                    tipoIngreso: "",
                    monto: 0,
                  })
                }
              >
                + Agregar actividad
              </button>
              <div className="space-y-3">
                {(values.ingresos ?? []).map((_, index) => (
                  <div key={index} className="panel-soft grid gap-3 form-grid sm:grid-cols-2">
                    <FormField
                      label="Tipo de ingreso"
                      name={`ingresos.${index}.tipoIngreso`}
                      className="sm:col-span-2"
                      placeholder="Ej. negocio familiar, consultoría, renta…"
                    />
                    <FormField label="Monto (MXN)" name={`ingresos.${index}.monto`} type="number" min={0} />
                    <button type="button" className="btn-danger btn-sm self-end" onClick={() => remove(index)}>
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </FieldArray>
      </section>
    </>
  );
}
