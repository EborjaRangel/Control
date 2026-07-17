"use client";

import { Form, Formik, useFormikContext } from "formik";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FormField, FormSelect } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { apiFetch } from "@/lib/api";
import {
  CODIGOS_POSTALES_COYOACAN,
  cpsDeColonia,
  nombreColoniaCatalogo,
  coloniaPorDefectoDeCp,
  coloniasParaSelect,
} from "@/lib/colonias";
import {
  etiquetaSeccion,
  seccionesParaSelect,
  TOTAL_SECCIONES_COYOACAN,
} from "@/lib/secciones-electorales";
import {
  representanteCasillaSchema,
  type RepresentanteCasillaFormValues,
} from "@/lib/validation-rc-rg";
import * as Yup from "yup";

type Props = {
  initialValues: RepresentanteCasillaFormValues;
  /** Rep. General: elegir colonia del distrito local del dirigente. */
  distritoLocal?: number | null;
  /** Rep. Casilla: colonia fija del dirigente; solo secciones de esa colonia. */
  coloniaAsignada?: string;
  onSubmit: (values: RepresentanteCasillaFormValues) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
};

function DomicilioFields({ coloniaFija }: { coloniaFija?: string }) {
  const { values, setFieldValue } = useFormikContext<RepresentanteCasillaFormValues>();
  const coloniaCatalogo = coloniaFija ? nombreColoniaCatalogo(coloniaFija) : undefined;

  useEffect(() => {
    if (coloniaCatalogo) {
      void setFieldValue("colonia", coloniaCatalogo);
    }
  }, [coloniaCatalogo, setFieldValue]);

  const cpsFiltrados = coloniaCatalogo ? cpsDeColonia(coloniaCatalogo) : [];
  const cpsDisponibles =
    coloniaCatalogo && cpsFiltrados.length > 0 ? cpsFiltrados : CODIGOS_POSTALES_COYOACAN;

  const colonias = values.codigoPostal
    ? coloniasParaSelect(values.codigoPostal, coloniaCatalogo ?? values.colonia)
    : [];

  return (
    <>
      {coloniaCatalogo ? (
        <div className="sm:col-span-2">
          <span className="label">Colonia (asignada)</span>
          <p className="mt-1 text-sm font-medium text-ink">{coloniaCatalogo}</p>
        </div>
      ) : null}
      <FormSelect
        label="Código postal"
        name="codigoPostal"
        onChange={(e) => {
          const cp = e.target.value;
          void setFieldValue("codigoPostal", cp);
          if (coloniaCatalogo) {
            void setFieldValue("colonia", coloniaCatalogo);
          } else {
            void setFieldValue("colonia", coloniaPorDefectoDeCp(cp));
          }
        }}
      >
        <option value="">Selecciona un CP</option>
        {cpsDisponibles.map((cp) => (
          <option key={cp} value={cp}>
            {cp}
          </option>
        ))}
      </FormSelect>
      {!coloniaCatalogo ? (
        <FormSelect label="Colonia" name="colonia" disabled={!values.codigoPostal}>
          <option value="">
            {!values.codigoPostal ? "Primero elige un CP" : "Selecciona una colonia"}
          </option>
          {colonias.map((c) => (
            <option key={c.nombre} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </FormSelect>
      ) : null}
      <FormField label="Calle" name="calle" className="sm:col-span-2" />
      <FormField label="Número exterior" name="numeroExterior" />
      <FormField label="Número interior" name="numeroInterior" />
    </>
  );
}

function SeccionPorColoniaSelect({ coloniaCatalogo }: { coloniaCatalogo: string }) {
  const { values, setFieldValue } = useFormikContext<RepresentanteCasillaFormValues>();
  const [seccionesColonia, setSeccionesColonia] = useState<string[]>([]);
  const [filtrado, setFiltrado] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!coloniaCatalogo) {
      setSeccionesColonia([]);
      setFiltrado(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ colonia: coloniaCatalogo });

    void apiFetch(`/api/secciones-electorales?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudieron cargar las secciones");
        return (await res.json()) as { secciones: string[]; filtrado: boolean };
      })
      .then((data) => {
        if (cancelled) return;
        setFiltrado(data.filtrado);
        const lista = data.filtrado
          ? data.secciones
          : seccionesParaSelect(values.seccionElectoral);
        setSeccionesColonia(lista);
        if (
          data.filtrado &&
          values.seccionElectoral &&
          !data.secciones.includes(values.seccionElectoral)
        ) {
          void setFieldValue("seccionElectoral", "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFiltrado(false);
          setSeccionesColonia(seccionesParaSelect(values.seccionElectoral));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coloniaCatalogo, setFieldValue, values.seccionElectoral]);

  const secciones = seccionesParaSelect(
    values.seccionElectoral,
    filtrado ? seccionesColonia : undefined,
  );

  const placeholder = loading
    ? "Cargando secciones…"
    : filtrado
      ? secciones.length > 0
        ? `Selecciona sección (${secciones.length} en esta colonia)`
        : "No hay secciones para esta colonia"
      : `Selecciona sección (${TOTAL_SECCIONES_COYOACAN} en Coyoacán)`;

  return (
    <FormSelect
      label="Sección electoral"
      name="seccionElectoral"
      disabled={loading || (filtrado && secciones.length === 0)}
    >
      <option value="">{placeholder}</option>
      {secciones.map((s) => (
        <option key={s} value={s}>
          {etiquetaSeccion(s)}
        </option>
      ))}
    </FormSelect>
  );
}

function ColoniaSeccionElectoralFields({ distritoLocal }: { distritoLocal: number }) {
  const { values, setFieldValue } = useFormikContext<RepresentanteCasillaFormValues>();
  const [colonias, setColonias] = useState<string[]>([]);
  const [loadingColonias, setLoadingColonias] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingColonias(true);
    void apiFetch(`/api/colonias?distritoLocal=${distritoLocal}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudieron cargar las colonias");
        return (await res.json()) as { colonias: string[] };
      })
      .then((data) => {
        if (cancelled) return;
        setColonias(data.colonias);
        if (
          values.coloniaSeccion &&
          !data.colonias.includes(values.coloniaSeccion)
        ) {
          void setFieldValue("coloniaSeccion", "");
          void setFieldValue("seccionElectoral", "");
        }
      })
      .catch(() => {
        if (!cancelled) setColonias([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingColonias(false);
      });

    return () => {
      cancelled = true;
    };
  }, [distritoLocal, setFieldValue, values.coloniaSeccion]);

  const coloniaCatalogo = values.coloniaSeccion
    ? nombreColoniaCatalogo(values.coloniaSeccion)
    : "";

  return (
    <>
      <FormSelect
        label="Colonia (distrito local)"
        name="coloniaSeccion"
        disabled={loadingColonias || colonias.length === 0}
        onChange={(e) => {
          void setFieldValue("coloniaSeccion", e.target.value);
          void setFieldValue("seccionElectoral", "");
        }}
      >
        <option value="">
          {loadingColonias
            ? "Cargando colonias…"
            : colonias.length > 0
              ? `Selecciona colonia (distrito local ${distritoLocal})`
              : "No hay colonias en este distrito local"}
        </option>
        {colonias.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </FormSelect>
      <SeccionPorColoniaSelect coloniaCatalogo={coloniaCatalogo} />
    </>
  );
}

export function RepresentanteCasillaForm({
  initialValues,
  distritoLocal,
  coloniaAsignada,
  onSubmit,
  cancelHref,
  submitLabel = "Registrar representante",
}: Props) {
  const [apiError, setApiError] = useState<string | null>(null);
  const coloniaRc = coloniaAsignada ? nombreColoniaCatalogo(coloniaAsignada) : "";

  const schema = distritoLocal
    ? representanteCasillaSchema.shape({
        coloniaSeccion: Yup.string()
          .trim()
          .required("Selecciona una colonia del distrito local"),
      })
    : representanteCasillaSchema;

  return (
    <Formik
      initialValues={{
        ...initialValues,
        colonia: coloniaAsignada ? coloniaRc : initialValues.colonia,
        coloniaSeccion: coloniaAsignada ? coloniaRc : initialValues.coloniaSeccion,
      }}
      validationSchema={schema}
      enableReinitialize
      onSubmit={async (values, { setSubmitting }) => {
        setApiError(null);
        try {
          await onSubmit(values);
        } catch (err) {
          setApiError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting }) => (
        <Form className="space-y-6">
          <section className="card-section space-y-4">
            <h2 className="section-title">Datos generales</h2>
            {distritoLocal ? (
              <p className="text-sm text-ink-secondary">
                Elige la colonia del <strong className="text-ink">distrito local {distritoLocal}</strong>{" "}
                del dirigente; luego selecciona la sección electoral correspondiente.
              </p>
            ) : coloniaRc ? (
              <p className="text-sm text-ink-secondary">
                Colonia asignada al dirigente:{" "}
                <strong className="text-ink">{coloniaRc}</strong>. Solo puedes elegir secciones
                electorales de esta colonia.
              </p>
            ) : null}
            <div className="grid gap-4 form-grid">
              <FormField label="Nombre(s)" name="nombre" />
              <FormField label="Primer apellido" name="primerApellido" />
              <FormField label="Segundo apellido" name="segundoApellido" />
              <FormField label="Fecha de nacimiento" name="fechaNacimiento" type="date" />
              <FormSelect label="Sexo" name="sexo">
                <option value="">Selecciona</option>
                <option value="H">Hombre</option>
                <option value="M">Mujer</option>
              </FormSelect>
              <FormField label="Clave de elector" name="claveElector" className="sm:col-span-2" />
              <FormField label="CURP" name="curp" className="sm:col-span-2" />
              {coloniaAsignada ? (
                <>
                  <div className="sm:col-span-2">
                    <span className="label">Colonia (asignada al dirigente)</span>
                    <p className="mt-1 text-sm font-medium text-ink">{coloniaRc}</p>
                  </div>
                  <SeccionPorColoniaSelect coloniaCatalogo={coloniaRc} />
                </>
              ) : distritoLocal ? (
                <ColoniaSeccionElectoralFields distritoLocal={distritoLocal} />
              ) : (
                <SeccionPorColoniaSelect
                  coloniaCatalogo={
                    initialValues.colonia ? nombreColoniaCatalogo(initialValues.colonia) : ""
                  }
                />
              )}
            </div>
          </section>

          <section className="card-section space-y-4">
            <h2 className="section-title">Domicilio</h2>
            <div className="grid gap-4 form-grid">
              <DomicilioFields coloniaFija={coloniaAsignada} />
            </div>
          </section>

          <section className="card-section space-y-4">
            <h2 className="section-title">Fotografías de la credencial</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <ImageUploadField name="ineFrenteUrl" label="Anverso (frente)" previewAlt="Credencial anverso" />
              <ImageUploadField name="ineReversoUrl" label="Reverso (atrás)" previewAlt="Credencial reverso" />
            </div>
          </section>

          {apiError ? <div className="alert-error">{apiError}</div> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <Link href={cancelHref} className="btn-ghost btn-responsive">
              Cancelar
            </Link>
            <button type="submit" className="btn-primary btn-responsive" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : submitLabel}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
