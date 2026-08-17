"use client";

import Link from "next/link";
import { useState } from "react";
import { Form, Formik } from "formik";
import { AxisLogo } from "@/components/AxisLogo";
import { FormField } from "@/components/FormField";
import { recuperarContrasenaSchema } from "@/lib/auth";

type RecuperarResponse = {
  ok?: boolean;
  mensaje?: string;
  devEnlace?: string;
  error?: string;
  detalles?: string[];
};

export default function RecuperarContrasenaPage() {
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [devEnlace, setDevEnlace] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center py-6 sm:py-12">
      <div className="card space-y-6 p-5 sm:p-8">
        <div className="space-y-3 text-center">
          <AxisLogo size={168} badge className="mx-auto" />
          <h1 className="sr-only">AXIS</h1>
          <p className="text-sm text-ink-secondary">Recupera tu contraseña</p>
        </div>

        {mensaje ? (
          <div className="space-y-4">
            <div className="alert-success">{mensaje}</div>
            {devEnlace ? (
              <div className="rounded-xl border border-line bg-surface-muted p-4 text-sm">
                <p className="font-medium text-ink">Enlace de desarrollo</p>
                <a
                  href={devEnlace}
                  className="mt-2 block break-all font-medium text-pin hover:underline"
                >
                  {devEnlace}
                </a>
              </div>
            ) : (
              <p className="text-sm text-ink-secondary">
                Revisa tu bandeja de entrada y la carpeta de spam. El enlace expira en 1 hora.
              </p>
            )}
            <Link href="/login" className="btn-primary btn-responsive w-full">
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <Formik
            initialValues={{ correo: "" }}
            validationSchema={recuperarContrasenaSchema}
            onSubmit={async (values, { setSubmitting }) => {
              setError(null);
              try {
                const res = await fetch("/api/auth/recuperar-contrasena", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    correo: values.correo.trim(),
                  }),
                });
                const data = (await res.json()) as RecuperarResponse;
                if (!res.ok) {
                  throw new Error(
                    data.detalles?.join(", ") ??
                      data.error ??
                      "No se pudo enviar el correo de recuperación",
                  );
                }
                setMensaje(
                  data.mensaje ??
                    "Si el correo está registrado en el sistema, recibirás un enlace para restablecer tu contraseña.",
                );
                setDevEnlace(data.devEnlace ?? null);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "No se pudo enviar el correo de recuperación",
                );
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4">
                {error ? <div className="alert-error">{error}</div> : null}

                <p className="text-sm text-ink-secondary">
                  Ingresa el correo electrónico registrado en tu ficha. Te enviaremos un enlace
                  para asignar una nueva contraseña.
                </p>

                <FormField
                  label="Correo electrónico"
                  name="correo"
                  type="email"
                  autoComplete="email"
                />

                <button
                  type="submit"
                  className="btn-primary btn-responsive w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Enviando…" : "Enviar enlace por correo"}
                </button>

                <p className="text-center text-sm">
                  <Link href="/login" className="font-medium text-pin hover:underline">
                    Volver a iniciar sesión
                  </Link>
                </p>
              </Form>
            )}
          </Formik>
        )}
      </div>
    </div>
  );
}
