"use client";

import dynamic from "next/dynamic";
import { Form, Formik, useFormikContext } from "formik";
import { UploadImage } from "@/components/UploadImage";
import { useEffect, useState } from "react";
import { FormField, FormSelect } from "@/components/FormField";
import { ComposicionSueldoFields } from "@/components/ComposicionSueldoFields";
import { SueldoDesglose } from "@/components/SueldoDesglose";
import {
  CODIGOS_POSTALES_COYOACAN,
  NOMBRES_COLONIAS_COYOACAN,
  coloniaPorDefectoDeCp,
  coloniasParaSelect,
  cpDeColonia,
  nombreColoniaCatalogo,
} from "@/lib/colonias";
import {
  seccionesParaSelect,
  etiquetaSeccion,
  TOTAL_SECCIONES_COYOACAN,
} from "@/lib/secciones-electorales";
import {
  TIPO_DIRIGENTE_LABEL,
  TIPOS_DIRIGENTE,
  calcularSueldo,
} from "@/lib/dirigentes";
import { apiFetch } from "@/lib/api";
import type { UnidadTerritorialResumen } from "@/lib/unidades-territoriales";
import { etiquetaUnidadTerritorial } from "@/lib/unidades-territoriales";
import type { DirigenteFormValues } from "@/lib/validation";
import { STATUS_DIRIGENTE, STATUS_DIRIGENTE_LABEL } from "@/lib/dirigente-spec";
import { dirigenteCreateSchema, dirigenteUpdateSchema } from "@/lib/validation";
import { prepareDirigentePayload } from "@/lib/dirigente-payload";
import { DirigenteExtraFields } from "@/components/DirigenteExtraFields";
import { credencialesPorDefecto } from "@/lib/credenciales-usuario";

const ETIQUETAS_CAMPO: Record<string, string> = {
  nombre: "Nombre",
  primerApellido: "Primer apellido",
  segundoApellido: "Segundo apellido",
  fechaNacimiento: "Fecha de nacimiento",
  telefonoCelular: "Celular",
  correo: "Correo",
  tipo: "Tipo de dirigente",
  seccionElectoral: "Sección electoral",
  colonia: "Colonia",
  codigoPostal: "Código postal",
  calle: "Calle",
  numeroExterior: "Número exterior",
  usuario: "Usuario",
  password: "Contraseña",
  distritoLocal: "Distrito local",
  distritoFederal: "Distrito federal",
  curp: "CURP",
  ineFrenteUrl: "Credencial (frente)",
  ineReversoUrl: "Credencial (reverso)",
  status: "Estatus",
  unidadTerritorialId: "Unidad territorial",
};

function flattenFormErrors(errors: Record<string, unknown>, prefix = ""): string[] {
  const mensajes: string[] = [];
  for (const [key, value] of Object.entries(errors)) {
    const ruta = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      const campo = ruta.split(".").pop() ?? ruta;
      const etiqueta = ETIQUETAS_CAMPO[campo] ?? ruta;
      mensajes.push(`${etiqueta}: ${value}`);
      continue;
    }
    if (value && typeof value === "object") {
      mensajes.push(...flattenFormErrors(value as Record<string, unknown>, ruta));
    }
  }
  return mensajes;
}

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
  initialValues: DirigenteFormValues;
  onSubmit: (values: DirigenteFormValues) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
  modo?: "crear" | "editar";
  /** Excluir este ID del selector de referente (edición). */
  dirigenteId?: string;
  /** Composición del sueldo (solo administrador). */
  showComposicionSueldo?: boolean;
};

function SeccionSelect() {
  const { values, setFieldValue } = useFormikContext<DirigenteFormValues>();
  const [seccionesColonia, setSeccionesColonia] = useState<string[]>([]);
  const [filtrado, setFiltrado] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!values.colonia) {
      setSeccionesColonia([]);
      setFiltrado(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ colonia: values.colonia });
    if (values.unidadTerritorialId) {
      params.set("unidadTerritorialId", values.unidadTerritorialId);
    }

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
  }, [values.colonia, values.unidadTerritorialId, setFieldValue]);

  const secciones = seccionesParaSelect(
    values.seccionElectoral,
    filtrado ? seccionesColonia : undefined,
  );

  const placeholder = !values.colonia
    ? "Primero elige una colonia"
    : loading
      ? "Cargando secciones…"
      : filtrado
        ? `Selecciona una sección (${secciones.length} en esta colonia)`
        : `Selecciona una sección (${TOTAL_SECCIONES_COYOACAN} en Coyoacán)`;

  return (
    <FormSelect
      label="Sección electoral"
      name="seccionElectoral"
      disabled={!values.colonia || loading}
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

function CodigoPostalColoniaFields({ modo }: { modo: "crear" | "editar" }) {
  const { values, setFieldValue } = useFormikContext<DirigenteFormValues>();
  const [coloniasDistrito, setColoniasDistrito] = useState<string[]>([]);
  const [loadingColoniasDistrito, setLoadingColoniasDistrito] = useState(false);

  useEffect(() => {
    if (values.distritoLocal == null) {
      setColoniasDistrito([]);
      return;
    }

    let cancelled = false;
    setLoadingColoniasDistrito(true);
    void apiFetch(`/api/colonias?distritoLocal=${values.distritoLocal}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudieron cargar las colonias");
        return (await res.json()) as { colonias: string[] };
      })
      .then((data) => {
        if (cancelled) return;
        setColoniasDistrito(data.colonias);
      })
      .catch(() => {
        if (!cancelled) setColoniasDistrito([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingColoniasDistrito(false);
      });

    return () => {
      cancelled = true;
    };
  }, [values.distritoLocal]);

  const coloniaActual = values.colonia ? nombreColoniaCatalogo(values.colonia) : "";
  const coloniasCp = values.codigoPostal
    ? coloniasParaSelect(values.codigoPostal, coloniaActual)
    : [];

  const opcionesColonia = (() => {
    if (coloniasDistrito.length > 0) {
      const nombres = [...coloniasDistrito];
      if (coloniaActual && !nombres.includes(coloniaActual)) {
        nombres.unshift(coloniaActual);
      }
      return nombres.map((nombre) => ({
        nombre,
        cp: cpDeColonia(nombre) ?? values.codigoPostal,
      }));
    }

    if (coloniasCp.length > 0) {
      return coloniasCp.map((c) => ({ nombre: c.nombre, cp: c.cp }));
    }

    if (modo === "editar") {
      return NOMBRES_COLONIAS_COYOACAN.map((nombre) => ({
        nombre,
        cp: cpDeColonia(nombre) ?? "",
      }));
    }

    return [];
  })();

  const coloniaEditable =
    !loadingColoniasDistrito &&
    opcionesColonia.length > 0 &&
    (modo === "editar" || Boolean(values.codigoPostal) || coloniasDistrito.length > 0);

  useEffect(() => {
    if (!coloniaActual) return;
    const cp = cpDeColonia(coloniaActual);
    if (cp && cp !== values.codigoPostal) {
      void setFieldValue("codigoPostal", cp);
    }
  }, [coloniaActual, setFieldValue, values.codigoPostal]);

  function handleColoniaChange(colonia: string) {
    void setFieldValue("colonia", colonia);
    const cp = cpDeColonia(colonia);
    if (cp) {
      void setFieldValue("codigoPostal", cp);
    }
    void setFieldValue("unidadTerritorialId", null);
  }

  return (
    <>
      <FormSelect
        label="Código postal"
        name="codigoPostal"
        onChange={(e) => {
          const cp = e.target.value;
          void setFieldValue("codigoPostal", cp);
          void setFieldValue("colonia", coloniaPorDefectoDeCp(cp));
          void setFieldValue("unidadTerritorialId", null);
          void setFieldValue("seccionElectoral", "");
        }}
      >
        <option value="">
          Selecciona un CP ({CODIGOS_POSTALES_COYOACAN.length} en Coyoacán)
        </option>
        {CODIGOS_POSTALES_COYOACAN.map((cp) => (
          <option key={cp} value={cp}>
            {cp}
          </option>
        ))}
      </FormSelect>

      <div>
        <FormSelect
          label="Colonia"
          name="colonia"
          disabled={!coloniaEditable || loadingColoniasDistrito}
          onChange={(e) => handleColoniaChange(e.target.value)}
        >
          <option value="">
            {loadingColoniasDistrito
              ? "Cargando colonias del distrito…"
              : !coloniaEditable
                ? "Primero elige un código postal"
                : "Selecciona una colonia"}
          </option>
          {opcionesColonia.map((c) => (
            <option key={c.nombre} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </FormSelect>
        {coloniasDistrito.length > 0 && values.distritoLocal != null ? (
          <p className="mt-1 text-xs text-ink-secondary">
            Colonias del distrito local {values.distritoLocal}. Puedes corregir la colonia asignada
            en la carga inicial.
          </p>
        ) : modo === "editar" ? (
          <p className="mt-1 text-xs text-ink-secondary">
            Puedes actualizar la colonia; el código postal se ajusta al elegir una colonia válida.
          </p>
        ) : null}
      </div>
    </>
  );
}

function UnidadTerritorialSelect() {
  const { values, setFieldValue } = useFormikContext<DirigenteFormValues>();
  const [uts, setUts] = useState<UnidadTerritorialResumen[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!values.colonia) {
      setUts([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void apiFetch(
      `/api/unidades-territoriales?colonia=${encodeURIComponent(values.colonia)}`,
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudieron cargar las unidades territoriales");
        return (await res.json()) as UnidadTerritorialResumen[];
      })
      .then((data) => {
        if (cancelled) return;
        setUts(data);
        if (data.length === 1) {
          void setFieldValue("unidadTerritorialId", data[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setUts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [values.colonia, setFieldValue]);

  if (!values.colonia) return null;
  if (loading) {
    return (
      <p className="text-sm text-ink-secondary sm:col-span-2">
        Cargando unidades territoriales…
      </p>
    );
  }
  if (uts.length === 0) return null;

  if (uts.length === 1) {
    return (
      <div className="sm:col-span-2">
        <span className="label">Unidad territorial (IECM)</span>
        <p className="mt-1 text-sm font-medium text-ink">
          {etiquetaUnidadTerritorial(uts[0])}
        </p>
      </div>
    );
  }

  return (
    <div className="sm:col-span-2">
      <FormSelect label="Unidad territorial (IECM)" name="unidadTerritorialId"
        onChange={(e) => {
          void setFieldValue("unidadTerritorialId", e.target.value);
          void setFieldValue("seccionElectoral", "");
        }}
      >
        <option value="">Selecciona la unidad territorial ({uts.length} en esta colonia)</option>
        {uts.map((ut) => (
          <option key={ut.id} value={ut.id}>
            {etiquetaUnidadTerritorial(ut)}
          </option>
        ))}
      </FormSelect>
    </div>
  );
}

function FotoUpload() {
  const { values, setFieldValue } = useFormikContext<DirigenteFormValues>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/api/upload", { method: "POST", body: formData });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Error al subir la imagen");
        return;
      }
      await setFieldValue("fotoUrl", data.url ?? null);
    } catch {
      setError("No se pudo subir la imagen");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <span className="label">Fotografía</span>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        {values.fotoUrl ? (
          <UploadImage
            src={values.fotoUrl}
            alt="Foto del dirigente"
            width={80}
            height={80}
            className="size-20 rounded-full object-cover ring-2 ring-pin-light shadow-pin"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full border-2 border-dashed border-line bg-surface-muted text-xs font-medium text-ink-secondary">
            Sin foto
          </div>
        )}
        <div className="space-y-2">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFile}
            disabled={uploading}
            className="text-sm text-ink-secondary file:mr-3 file:rounded-full file:border-0 file:bg-pin-light file:px-4 file:py-2 file:text-xs file:font-semibold file:text-pin-dark hover:file:bg-pin-muted"
          />
          {values.fotoUrl ? (
            <button
              type="button"
              className="block text-xs font-semibold text-pin hover:text-pin-hover"
              onClick={() => void setFieldValue("fotoUrl", null)}
            >
              Quitar foto
            </button>
          ) : null}
          {uploading ? <p className="text-xs text-ink-secondary">Subiendo…</p> : null}
          {error ? <p className="field-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

function SueldoPreview() {
  const { values } = useFormikContext<DirigenteFormValues>();
  const desglose = calcularSueldo(
    (values.conceptosComposicion ?? []).map((c) => ({
      concepto: c.concepto,
      monto: Number(c.monto) || 0,
      nombre: c.nombre,
      tipoDetalle: c.tipoDetalle,
    })),
  );
  return <SueldoDesglose desglose={desglose} />;
}

function CredencialesAcceso({ modo }: { modo: "crear" | "editar" }) {
  const { values, setFieldValue } = useFormikContext<DirigenteFormValues>();

  useEffect(() => {
    if (modo === "crear") {
      const { usuario, password } = credencialesPorDefecto(
        values.nombre,
        values.primerApellido,
      );
      if (usuario) setFieldValue("usuario", usuario);
      setFieldValue("password", password);
      return;
    }
    if (!values.usuario?.trim()) {
      const sugerido = credencialesPorDefecto(values.nombre, values.primerApellido).usuario;
      if (sugerido) setFieldValue("usuario", sugerido);
    }
  }, [modo, values.nombre, values.primerApellido, values.usuario, setFieldValue]);

  return null;
}

export function DirigenteForm({
  initialValues,
  onSubmit,
  submitLabel = "Guardar",
  cancelHref,
  modo = "crear",
  dirigenteId,
  showComposicionSueldo = false,
}: Props) {
  const [apiError, setApiError] = useState<string | null>(null);
  const validationSchema =
    modo === "crear" ? dirigenteCreateSchema : dirigenteUpdateSchema;

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      enableReinitialize
      onSubmit={async (values, { setSubmitting }) => {
        setApiError(null);
        try {
          const payload = prepareDirigentePayload(values, modo);
          if (modo === "editar" && !payload.password) {
            payload.usuario = initialValues.usuario?.trim() ?? "";
          }
          await onSubmit(payload);
        } catch (err) {
          setApiError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, submitCount, errors, values }) => (
        <Form className="space-y-8">
          <CredencialesAcceso modo={modo} />
          <section className="card-section space-y-4">
            <h2 className="section-title">Datos personales</h2>
            <div className="grid gap-4 form-grid">
              <FormField label="Nombre(s)" name="nombre" autoComplete="given-name" />
              <FormField label="Primer apellido" name="primerApellido" autoComplete="family-name" />
              <FormField label="Segundo apellido" name="segundoApellido" autoComplete="family-name" />
              <FormField label="Fecha de nacimiento" name="fechaNacimiento" type="date" />
              <FormField label="Celular (10 dígitos)" name="telefonoCelular" inputMode="numeric" />
              <FormField label="Correo electrónico" name="correo" type="email" autoComplete="email" />
            </div>
            <FotoUpload />
          </section>

          <DirigenteExtraFields excludeReferenteId={dirigenteId} />

          <section className="card-section space-y-4">
            <h2 className="section-title">Acceso al sistema</h2>
            <p className="text-sm text-ink-secondary">
              Usuario: primera letra del nombre + apellido paterno en minúsculas (ej. jperez).
              Contraseña inicial: 123456. Puedes cambiar ambos al editar.
            </p>
            <div className="grid gap-4 form-grid">
              <FormField
                label="Usuario"
                name="usuario"
                autoComplete={modo === "crear" ? "username" : "off"}
                className="sm:col-span-2"
              />
              <FormField
                label={modo === "crear" ? "Contraseña" : "Nueva contraseña"}
                name="password"
                type="password"
                autoComplete={modo === "crear" ? "new-password" : "off"}
              />
              {modo === "editar" ? (
                <p className="text-xs text-ink-secondary sm:col-span-2">
                  Deja la contraseña en blanco para mantener la actual. Puedes cambiar usuario y
                  contraseña cuando lo necesites.
                </p>
              ) : null}
            </div>
          </section>

          <section className="card-section space-y-4">
            <h2 className="section-title">Clasificación electoral</h2>
            <div className="grid gap-4 form-grid">
              <FormSelect label="Tipo de dirigente" name="tipo">
                {TIPOS_DIRIGENTE.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_DIRIGENTE_LABEL[t]}
                  </option>
                ))}
              </FormSelect>
              <FormSelect label="Estatus (Excel)" name="status">
                {STATUS_DIRIGENTE.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_DIRIGENTE_LABEL[s]}
                  </option>
                ))}
              </FormSelect>
            </div>
          </section>

          <section className="card-section space-y-4">
            <h2 className="section-title">Dirección (Coyoacán)</h2>
            <div className="grid gap-4 form-grid">
              <CodigoPostalColoniaFields modo={modo} />
              <UnidadTerritorialSelect />
              <FormField label="Calle" name="calle" className="sm:col-span-2" />
              <FormField label="Número exterior" name="numeroExterior" />
              <FormField label="Número interior" name="numeroInterior" />
            </div>
          </section>

          <section className="card-section space-y-4">
            <h2 className="section-title">Sección electoral</h2>
            <div className="grid gap-4 form-grid">
              <SeccionSelect />
            </div>
            <SeccionElectoralMap
              seccion={values.seccionElectoral}
              colonia={values.colonia || undefined}
            />
          </section>

          {showComposicionSueldo ? (
            <section className="card-section space-y-4">
              <h2 className="section-title">Composición del sueldo</h2>
              <ComposicionSueldoFields />
              <SueldoPreview />
            </section>
          ) : null}

          {(apiError || (submitCount > 0 && Object.keys(errors).length > 0)) ? (
            <div className="space-y-3">
              {apiError ? <div className="alert-error">{apiError}</div> : null}
              {submitCount > 0 && Object.keys(errors).length > 0 ? (
                <div className="alert-error space-y-2">
                  <p>Hay campos con errores. Revisa los marcados en rojo antes de guardar.</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {flattenFormErrors(errors as Record<string, unknown>).map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="page-actions">
            <button type="submit" className="btn-primary btn-responsive" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : submitLabel}
            </button>
            {cancelHref ? (
              <a href={cancelHref} className="btn-ghost btn-responsive">
                Cancelar
              </a>
            ) : null}
          </div>
        </Form>
      )}
    </Formik>
  );
}
