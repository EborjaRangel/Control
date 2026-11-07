"use client";

import { Form, Formik, useFormikContext } from "formik";
import { useEffect, useState } from "react";
import { ServicioUrbanoMapPicker } from "@/components/ServicioUrbanoMapPicker";
import { ImageUploadStandalone } from "@/components/ImageUploadStandalone";
import { apiFetch } from "@/lib/api";
import type { EventoTransporteResumenDTO } from "@/lib/transporte";
import {
  MAX_FOTOS_TRANSPORTE,
  registroTransporteFormSchema,
  resumenCamposFaltantesRegistroTransporte,
  type RegistroTransporteFormValues,
} from "@/lib/validation-transporte";

type Props = {
  eventos: EventoTransporteResumenDTO[];
  onSuccess: () => void;
  onCancel: () => void;
};

function valoresIniciales(eventos: EventoTransporteResumenDTO[]): RegistroTransporteFormValues {
  return {
    eventoId: eventos[0]?.id ?? "",
    tipoUnidad: "CAMION",
    placas: "",
    nombreChofer: "",
    telefonoChofer: "",
    tipoRecorrido: "IDA_Y_VUELTA",
    puntoEntrega: "",
    direccionMapa: "",
    lat: null,
    lng: null,
    fotos: [],
  };
}

function UbicacionDispositivo() {
  const { values, setFieldValue } = useFormikContext<RegistroTransporteFormValues>();
  const [geoMensaje, setGeoMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (values.lat != null && values.lng != null) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoMensaje("Ubica el punto en el mapa si el dispositivo no comparte GPS.");
      return;
    }
    setGeoMensaje("Obteniendo ubicación del dispositivo…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void setFieldValue("lat", pos.coords.latitude);
        void setFieldValue("lng", pos.coords.longitude);
        setGeoMensaje(null);
      },
      () => {
        setGeoMensaje("No se pudo leer el GPS. Coloca el pin en el mapa.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }, [values.lat, values.lng, setFieldValue]);

  return geoMensaje ? <p className="text-sm text-ink-secondary">{geoMensaje}</p> : null;
}

export function RegistroTransporteForm({ eventos, onSuccess, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  return (
    <Formik<RegistroTransporteFormValues>
      initialValues={valoresIniciales(eventos)}
      enableReinitialize
      validationSchema={registroTransporteFormSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setError(null);
        setExito(false);
        if (values.lat == null || values.lng == null) {
          setError("Falta la ubicación. Permite el GPS o marca el punto en el mapa.");
          setSubmitting(false);
          return;
        }
        if (!values.fotos?.length) {
          setError("Sube al menos una foto de la unidad (espera a que termine de subir).");
          setSubmitting(false);
          return;
        }
        try {
          const res = await apiFetch("/api/transporte/registros", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventoId: values.eventoId,
              tipoUnidad: values.tipoUnidad,
              placas: values.placas,
              nombreChofer: values.nombreChofer,
              telefonoChofer: values.telefonoChofer,
              tipoRecorrido: values.tipoRecorrido,
              puntoEntrega: values.puntoEntrega,
              lat: values.lat,
              lng: values.lng,
              fotos: values.fotos,
            }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            detalles?: string[];
          };
          if (!res.ok) {
            const detalle = data.detalles?.filter(Boolean).join(" ");
            throw new Error(
              [data.error, detalle].filter(Boolean).join(" — ") ||
                `No se pudo guardar (código ${res.status}). Intenta de nuevo.`,
            );
          }
          setExito(true);
          window.setTimeout(() => onSuccess(), 1400);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al guardar");
          setSubmitting(false);
        }
      }}
    >
      {({ values, setFieldValue, isSubmitting, errors, submitCount }) => {
        const fotos = values.fotos ?? [];
        const puedeAgregarFoto = fotos.length < MAX_FOTOS_TRANSPORTE;
        const mostrarErrores = submitCount > 0;
        const resumenFaltantes = mostrarErrores
          ? resumenCamposFaltantesRegistroTransporte(errors)
          : null;
        const ubicacionLista = values.lat != null && values.lng != null;

        return (
          <Form className="card-section space-y-5">
            {exito ? (
              <div className="alert-success text-center text-lg font-semibold">
                Transporte registrado correctamente
              </div>
            ) : null}
            {resumenFaltantes ? (
              <div className="alert-error text-sm font-medium">{resumenFaltantes}</div>
            ) : null}
            <label className="block">
              <span className="label">Evento</span>
              <select
                className="input mt-1"
                value={values.eventoId}
                onChange={(e) => void setFieldValue("eventoId", e.target.value)}
              >
                {eventos.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.titulo} ({ev.fecha})
                  </option>
                ))}
              </select>
              {mostrarErrores && errors.eventoId ? (
                <p className="field-error mt-1">{errors.eventoId}</p>
              ) : null}
            </label>

            <fieldset className="space-y-2">
              <legend className="label">Tipo de transporte</legend>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ["CAMION", "Camión"],
                    ["MICROBUS", "Microbús"],
                    ["VAN", "Van"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="tipoUnidad"
                      checked={values.tipoUnidad === value}
                      onChange={() => void setFieldValue("tipoUnidad", value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {mostrarErrores && errors.tipoUnidad ? (
                <p className="field-error">{errors.tipoUnidad}</p>
              ) : null}
            </fieldset>

            <label className="block">
              <span className="label">Placas</span>
              <input
                className="input mt-1"
                value={values.placas}
                onChange={(e) => void setFieldValue("placas", e.target.value.toUpperCase())}
                autoCapitalize="characters"
              />
              {mostrarErrores && errors.placas ? (
                <p className="field-error mt-1">{errors.placas}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="label">Nombre del chofer</span>
              <input
                className="input mt-1"
                value={values.nombreChofer}
                onChange={(e) => void setFieldValue("nombreChofer", e.target.value)}
              />
              {mostrarErrores && errors.nombreChofer ? (
                <p className="field-error mt-1">{errors.nombreChofer}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="label">Teléfono del chofer (10 dígitos)</span>
              <input
                className="input mt-1"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={values.telefonoChofer}
                onChange={(e) =>
                  void setFieldValue("telefonoChofer", e.target.value.replace(/\D/g, "").slice(0, 10))
                }
              />
              {mostrarErrores && errors.telefonoChofer ? (
                <p className="field-error mt-1">{errors.telefonoChofer}</p>
              ) : null}
            </label>

            <fieldset className="space-y-2">
              <legend className="label">Tipo de recorrido</legend>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ["IDA", "Ida"],
                    ["VUELTA", "Vuelta"],
                    ["IDA_Y_VUELTA", "Ida y vuelta"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="tipoRecorrido"
                      checked={values.tipoRecorrido === value}
                      onChange={() => void setFieldValue("tipoRecorrido", value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {mostrarErrores && errors.tipoRecorrido ? (
                <p className="field-error">{errors.tipoRecorrido}</p>
              ) : null}
            </fieldset>

            <label className="block">
              <span className="label">Punto de entrega</span>
              <input
                className="input mt-1"
                value={values.puntoEntrega}
                onChange={(e) => void setFieldValue("puntoEntrega", e.target.value)}
                placeholder="Ej. Andador principal, frente a…"
              />
              {mostrarErrores && errors.puntoEntrega ? (
                <p className="field-error mt-1">{errors.puntoEntrega}</p>
              ) : null}
            </label>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="section-title">Ubicación de la captura</h2>
                {ubicacionLista ? (
                  <span className="badge-pin text-xs">Ubicación capturada</span>
                ) : (
                  <span className="text-xs text-ink-secondary">Pendiente</span>
                )}
              </div>
              <UbicacionDispositivo />
              <ServicioUrbanoMapPicker
                lat={values.lat}
                lng={values.lng}
                direccion={values.direccionMapa ?? ""}
                onChange={({ lat, lng, direccion }) => {
                  void setFieldValue("lat", lat);
                  void setFieldValue("lng", lng);
                  void setFieldValue("direccionMapa", direccion);
                }}
              />
              {mostrarErrores && (errors.lat || errors.lng) ? (
                <p className="field-error">{errors.lat ?? errors.lng}</p>
              ) : null}
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="section-title">Fotos de la unidad</h2>
                <span className="text-xs text-ink-secondary">
                  {fotos.length}/{MAX_FOTOS_TRANSPORTE}
                </span>
              </div>
              <p className="text-sm text-ink-secondary">
                Toma fotos con la cámara o elige de la galería (hasta {MAX_FOTOS_TRANSPORTE} por
                registro).
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                {fotos.map((url, index) => (
                  <ImageUploadStandalone
                    key={`${index}-${url}`}
                    label={`Foto ${index + 1}`}
                    value={url}
                    previewAlt={`Unidad ${index + 1}`}
                    onChange={(next) => {
                      const updated = [...fotos];
                      updated[index] = next;
                      void setFieldValue("fotos", updated.filter(Boolean));
                    }}
                  />
                ))}
                {puedeAgregarFoto ? (
                  <ImageUploadStandalone
                    label={`Foto ${fotos.length + 1}`}
                    value=""
                    previewAlt="Nueva foto"
                    onChange={(url) => {
                      if (!url) return;
                      void setFieldValue("fotos", [...fotos, url]);
                    }}
                  />
                ) : null}
              </div>
              {mostrarErrores && errors.fotos ? (
                <p className="field-error">
                  {typeof errors.fotos === "string" ? errors.fotos : "Revisa las fotografías"}
                </p>
              ) : null}
            </section>

            {error ? <div className="alert-error">{error}</div> : null}

            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" className="btn-secondary btn-responsive" onClick={onCancel}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary btn-responsive"
                disabled={isSubmitting || exito}
              >
                {exito ? "Listo" : isSubmitting ? "Registrando…" : "Registrar transporte"}
              </button>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
