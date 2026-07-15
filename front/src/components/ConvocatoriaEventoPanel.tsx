"use client";

import { Form, Formik } from "formik";
import { useCallback, useEffect, useState } from "react";
import { FormTextarea } from "@/components/FormField";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import {
  CANAL_CONVOCATORIA_LABEL,
  ESTADO_ENVIO_LABEL,
  type ConvocatoriaEstado,
  type ResumenEnviosEvento,
  type ResumenConvocatoriaEvento,
} from "@/lib/convocatoria";
import {
  convocatoriaEventoSchema,
  type ConvocatoriaFormValues,
} from "@/lib/validation-convocatoria";

type Props = {
  eventoId: string;
  totalElegibles: number;
};

export function ConvocatoriaEventoPanel({ eventoId, totalElegibles }: Props) {
  const [config, setConfig] = useState<ConvocatoriaEstado | null>(null);
  const [envios, setEnvios] = useState<ResumenEnviosEvento | null>(null);
  const [resultado, setResultado] = useState<ResumenConvocatoriaEvento | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadEnvios = useCallback(async () => {
    const res = await apiFetch(`/api/convocatoria/eventos/${eventoId}/envios`);
    if (!res.ok) return;
    setEnvios((await res.json()) as ResumenEnviosEvento);
  }, [eventoId]);

  useEffect(() => {
    void Promise.all([
      apiFetch("/api/convocatoria/estado").then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as ConvocatoriaEstado;
      }),
      loadEnvios(),
    ]).then(([cfg]) => {
      if (cfg) setConfig(cfg);
    });
  }, [loadEnvios]);

  async function handleEnviar(values: ConvocatoriaFormValues) {
    setError(null);
    setResultado(null);
    const res = await apiFetch(`/api/convocatoria/eventos/${eventoId}/enviar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje: values.mensaje.trim() }),
    });
    const data = (await res.json()) as ResumenConvocatoriaEvento & {
      error?: string;
      detalles?: string[];
    };
    if (!res.ok) {
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al enviar");
    }
    setResultado(data);
    await loadEnvios();
  }

  return (
    <section className="card-section space-y-4">
      <div>
        <h2 className="section-title">Convocatoria</h2>
        <p className="text-sm text-ink-secondary">
          Captura el mensaje y envíalo a los {totalElegibles} dirigente(s) elegibles por{" "}
          <strong>correo electrónico</strong>, <strong>SMS</strong> y <strong>WhatsApp</strong>.
        </p>
      </div>

      {config && !config.listo ? (
        <div className="alert-error text-sm">
          <p className="font-medium">Envíos reales no disponibles</p>
          <p className="mt-1">
            Configura en <code className="text-xs">back/.env</code> las credenciales SMTP y Twilio.
            Faltan: {config.faltantes.join(", ")}
          </p>
        </div>
      ) : null}

      <ul className="grid gap-2 text-sm sm:grid-cols-3">
        <li className="panel-soft">
          Correo: {config?.email ? "configurado" : "falta SMTP"}
        </li>
        <li className="panel-soft">SMS: {config?.sms ? "configurado" : "falta Twilio SMS"}</li>
        <li className="panel-soft">
          WhatsApp: {config?.whatsapp ? "configurado" : "falta Twilio WhatsApp"}
        </li>
      </ul>

      <Formik
        initialValues={{ mensaje: "" }}
        validationSchema={convocatoriaEventoSchema}
        onSubmit={async (values, { setSubmitting, resetForm }) => {
          setError(null);
          try {
            await handleEnviar(values);
            resetForm();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Error al enviar");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting, values }) => (
          <Form className="space-y-4">
            <FormTextarea
              label="Mensaje de convocatoria"
              name="mensaje"
              placeholder="Escribe la convocatoria al evento: fecha, hora, lugar, indicaciones de asistencia…"
              maxLength={1000}
              className="min-h-[120px] resize-y"
            />
            <span className="-mt-2 block text-xs text-ink-secondary">
              {values.mensaje.trim().length}/1000 caracteres
            </span>

            <button
              type="submit"
              className="btn-primary btn-responsive"
              disabled={isSubmitting || !config?.listo}
            >
              {isSubmitting ? "Enviando convocatoria…" : "Enviar convocatoria (3 vías)"}
            </button>
          </Form>
        )}
      </Formik>

      {error ? <div className="alert-error">{error}</div> : null}

      {resultado ? (
        <div className="panel-pin space-y-2 text-sm">
          <p className="font-semibold text-pin-dark">Convocatoria enviada</p>
          <p>
            Correo: {resultado.email.enviados} enviados, {resultado.email.fallidos} fallidos,{" "}
            {resultado.email.omitidos} omitidos
          </p>
          <p>
            SMS: {resultado.sms.enviados} enviados, {resultado.sms.fallidos} fallidos,{" "}
            {resultado.sms.omitidos} omitidos
          </p>
          <p>
            WhatsApp: {resultado.whatsapp.enviados} enviados, {resultado.whatsapp.fallidos}{" "}
            fallidos, {resultado.whatsapp.omitidos} omitidos
          </p>
        </div>
      ) : null}

      {envios && envios.total > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Historial de convocatorias ({envios.total})</h3>

          <ul className="mobile-only-list">
            {envios.ultimos.slice(0, 15).map((e) => (
              <li key={e.id} className="list-card text-xs">
                <p className="font-medium text-ink">{e.dirigente.nombreCompleto}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                  <div>
                    <dt className="text-ink-secondary">Vía</dt>
                    <dd>{CANAL_CONVOCATORIA_LABEL[e.canal] ?? e.canal}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-secondary">Estado</dt>
                    <dd>
                      <span
                        className={
                          e.estado === "ENVIADO"
                            ? "badge-pin"
                            : e.estado === "FALLIDO"
                              ? "badge-muted"
                              : "badge-warning"
                        }
                      >
                        {ESTADO_ENVIO_LABEL[e.estado] ?? e.estado}
                      </span>
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-ink-secondary">Destino</dt>
                    <dd className="break-anywhere font-mono text-[11px]">{e.destino || "—"}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          <div className="desktop-only-table">
            <TableWrap>
              <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="border-b border-line text-ink-secondary">
                  <th className="py-2 pr-2">Dirigente</th>
                  <th className="py-2 pr-2">Vía</th>
                  <th className="py-2 pr-2">Destino</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {envios.ultimos.slice(0, 15).map((e) => (
                  <tr key={e.id} className="border-b border-line/60">
                    <td className="py-2 pr-2">{e.dirigente.nombreCompleto}</td>
                    <td className="py-2 pr-2">{CANAL_CONVOCATORIA_LABEL[e.canal] ?? e.canal}</td>
                    <td className="py-2 pr-2 font-mono text-[11px]">{e.destino || "—"}</td>
                    <td className="py-2">
                      <span
                        className={
                          e.estado === "ENVIADO"
                            ? "badge-pin"
                            : e.estado === "FALLIDO"
                              ? "badge-muted"
                              : "badge-warning"
                        }
                      >
                        {ESTADO_ENVIO_LABEL[e.estado] ?? e.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </TableWrap>
          </div>
        </div>
      ) : null}
    </section>
  );
}
