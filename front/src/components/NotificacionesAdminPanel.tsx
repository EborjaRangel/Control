"use client";

import { Form, Formik, useField, useFormikContext } from "formik";
import { useCallback, useEffect, useState } from "react";
import { FormSelect, FormTextarea } from "@/components/FormField";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api";
import { NOMBRES_COLONIAS_COYOACAN } from "@/lib/colonias";
import { TIPO_DIRIGENTE_LABEL, TIPOS_DIRIGENTE } from "@/lib/dirigentes";
import {
  ALCANCE_NOTIFICACION_LABEL,
  type NotificacionEnviarResultado,
  type NotificacionHistorialItem,
  formatFechaNotificacion,
} from "@/lib/notificaciones";
import {
  DISTRITOS_FEDERALES_COYOACAN,
  DISTRITOS_LOCALES_COYOACAN,
  SECCIONES_ELECTORALES_COYOACAN,
  etiquetaSeccion,
} from "@/lib/secciones-electorales";
import { etiquetaUnidadTerritorial, type UnidadTerritorialResumen } from "@/lib/unidades-territoriales";
import {
  ALCANCES_NOTIFICACION,
  EMPTY_NOTIFICACION,
  notificacionEnviarSchema,
  payloadFromNotificacionForm,
  type NotificacionFormValues,
} from "@/lib/validation-notificacion";

function AlcanceSelect() {
  const { setFieldValue, submitCount } = useFormikContext<NotificacionFormValues>();
  const [field, meta] = useField("alcance");
  const hasError = Boolean(meta.error && (meta.touched || submitCount > 0));

  return (
    <label className="label">
      Destinatarios
      <select
        {...field}
        className={cn("input", hasError && "input-error")}
        onChange={(e) => {
          const alcance = e.target.value;
          void setFieldValue("alcance", alcance);
          void setFieldValue("colonia", "");
          void setFieldValue("seccionElectoral", "");
          void setFieldValue("unidadTerritorialId", "");
          void setFieldValue("distritoLocal", "");
          void setFieldValue("distritoFederal", "");
          void setFieldValue("tipoDirigente", "");
        }}
      >
        <option value="">Selecciona alcance…</option>
        {ALCANCES_NOTIFICACION.map((a) => (
          <option key={a} value={a}>
            {ALCANCE_NOTIFICACION_LABEL[a]}
          </option>
        ))}
      </select>
      {hasError ? <p className="field-error">{meta.error}</p> : null}
    </label>
  );
}

function AlcanceCampos({ uts }: { uts: UnidadTerritorialResumen[] }) {
  const { values } = useFormikContext<NotificacionFormValues>();

  if (values.alcance === "COLONIA") {
    return (
      <FormSelect label="Colonia" name="colonia">
        <option value="">Selecciona colonia…</option>
        {NOMBRES_COLONIAS_COYOACAN.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </FormSelect>
    );
  }
  if (values.alcance === "SECCION") {
    return (
      <FormSelect label="Sección electoral" name="seccionElectoral">
        <option value="">Selecciona sección…</option>
        {SECCIONES_ELECTORALES_COYOACAN.map((s) => (
          <option key={s} value={s}>
            {etiquetaSeccion(s)}
          </option>
        ))}
      </FormSelect>
    );
  }
  if (values.alcance === "UNIDAD_TERRITORIAL") {
    return (
      <FormSelect label="Unidad territorial" name="unidadTerritorialId">
        <option value="">Selecciona UT…</option>
        {uts.map((ut) => (
          <option key={ut.id} value={ut.id}>
            {etiquetaUnidadTerritorial(ut)}
          </option>
        ))}
      </FormSelect>
    );
  }
  if (values.alcance === "DISTRITO_LOCAL") {
    return (
      <FormSelect label="Distrito local" name="distritoLocal">
        <option value="">Selecciona distrito…</option>
        {DISTRITOS_LOCALES_COYOACAN.map((d) => (
          <option key={d} value={String(d)}>
            Distrito local {d}
          </option>
        ))}
      </FormSelect>
    );
  }
  if (values.alcance === "DISTRITO_FEDERAL") {
    return (
      <FormSelect label="Distrito federal" name="distritoFederal">
        <option value="">Selecciona distrito…</option>
        {DISTRITOS_FEDERALES_COYOACAN.map((d) => (
          <option key={d} value={String(d)}>
            Distrito federal {d}
          </option>
        ))}
      </FormSelect>
    );
  }
  if (values.alcance === "TIPO_DIRIGENTE") {
    return (
      <FormSelect label="Tipo de dirigente" name="tipoDirigente">
        <option value="">Selecciona tipo…</option>
        {TIPOS_DIRIGENTE.map((t) => (
          <option key={t} value={t}>
            {TIPO_DIRIGENTE_LABEL[t]}
          </option>
        ))}
      </FormSelect>
    );
  }
  return null;
}

export function NotificacionesAdminPanel() {
  const [uts, setUts] = useState<UnidadTerritorialResumen[]>([]);
  const [preview, setPreview] = useState<{ dirigentes: number; usuarios: number } | null>(null);
  const [resultado, setResultado] = useState<NotificacionEnviarResultado | null>(null);
  const [historial, setHistorial] = useState<NotificacionHistorialItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadHistorial = useCallback(async () => {
    const res = await apiFetch("/api/notificaciones/historial");
    if (res.ok) setHistorial((await res.json()) as NotificacionHistorialItem[]);
  }, []);

  useEffect(() => {
    void apiFetch("/api/unidades-territoriales/catalogo")
      .then(async (res) => (res.ok ? ((await res.json()) as UnidadTerritorialResumen[]) : []))
      .then(setUts);
    void loadHistorial();
  }, [loadHistorial]);

  return (
    <section className="card-section space-y-6">
      <div>
        <h2 className="section-title">Notificaciones in-app</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          El mensaje aparecerá en la app de cada usuario destinatario. Queda guardado hasta que lo
          marquen como visto.
        </p>
      </div>

      <Formik
        initialValues={EMPTY_NOTIFICACION}
        validationSchema={notificacionEnviarSchema}
        onSubmit={async (values, { setSubmitting, resetForm }) => {
          setError(null);
          setResultado(null);
          try {
            const payload = payloadFromNotificacionForm(values);
            const res = await apiFetch("/api/notificaciones/enviar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = (await res.json()) as NotificacionEnviarResultado & {
              error?: string;
              detalles?: string[];
            };
            if (!res.ok) {
              throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al enviar");
            }
            setResultado(data);
            resetForm();
            setPreview(null);
            await loadHistorial();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Error al enviar");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ values, isSubmitting, validateForm, setTouched, setFieldValue }) => (
          <Form className="space-y-4">
            <FormTextarea
              label="Mensaje de notificación"
              name="mensaje"
              rows={5}
              placeholder="Escribe el aviso que verán los usuarios en su panel…"
              className="uppercase"
              onChange={(e) => {
                void setFieldValue("mensaje", e.target.value.toUpperCase());
              }}
            />
            <p className="-mt-2 text-xs text-ink-secondary">
              El mensaje se guarda automáticamente en MAYÚSCULAS.
            </p>

            <div className="form-grid">
              <AlcanceSelect />
              <AlcanceCampos uts={uts} />
            </div>

            {preview ? (
              <p className="text-sm text-ink-secondary">
                Vista previa: {preview.dirigentes} dirigente(s) · {preview.usuarios} usuario(s) con
                acceso
              </p>
            ) : null}

            <div className="card-actions">
              <button
                type="button"
                className="btn-secondary btn-responsive"
                disabled={!values.alcance}
                onClick={() => {
                  void (async () => {
                    const errors = await validateForm();
                    if (Object.keys(errors).length > 0) {
                      void setTouched({
                        mensaje: true,
                        alcance: true,
                        colonia: true,
                        seccionElectoral: true,
                        unidadTerritorialId: true,
                        distritoLocal: true,
                        distritoFederal: true,
                        tipoDirigente: true,
                      });
                      return;
                    }
                    const payload = payloadFromNotificacionForm(values);
                    const res = await apiFetch("/api/notificaciones/preview", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    if (res.ok) {
                      setPreview((await res.json()) as { dirigentes: number; usuarios: number });
                    }
                  })();
                }}
              >
                Calcular destinatarios
              </button>
              <button type="submit" className="btn-primary btn-responsive" disabled={isSubmitting}>
                {isSubmitting ? "Enviando…" : "Enviar notificación"}
              </button>
            </div>
          </Form>
        )}
      </Formik>

      {error ? <div className="alert-error">{error}</div> : null}

      {resultado ? (
        <div className="panel-pin text-sm">
          <p className="font-semibold text-pin-dark">Notificación enviada</p>
          <p>
            {resultado.destinatarios} usuario(s) · {resultado.alcanceLabel}
          </p>
          {resultado.enviadoAt ? (
            <p className="text-ink-secondary">{formatFechaNotificacion(resultado.enviadoAt)}</p>
          ) : null}
        </div>
      ) : null}

      {historial.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Historial reciente</h3>
          <ul className="space-y-2">
            {historial.slice(0, 10).map((h) => (
              <li key={h.id} className="panel-soft text-sm">
                <p className="font-medium text-ink">{h.alcanceLabel}</p>
                <p className="mt-1 line-clamp-2 text-ink-secondary">{h.mensaje}</p>
                <p className="mt-1 text-xs text-ink-secondary">
                  {formatFechaNotificacion(h.enviadoAt)} · {h.destinatarios} destinatario(s)
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
