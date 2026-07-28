"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Form, Formik } from "formik";
import { useParams } from "next/navigation";
import { CoyoteLogo } from "@/components/CoyoteLogo";
import { FormField } from "@/components/FormField";
import { restablecerContrasenaSchema } from "@/lib/auth";
import { APP_TITLE, APP_TITLE_SHORT } from "@/lib/site";

type ValidarResponse = {
  ok?: boolean;
  username?: string;
  error?: string;
};

type RestablecerResponse = {
  ok?: boolean;
  error?: string;
  detalles?: string[];
};

export default function RestablecerContrasenaPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params.token === "string" ? decodeURIComponent(params.token) : "";
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function validarEnlace() {
      if (!token) {
        setError("Enlace inválido o expirado");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/auth/restablecer-contrasena?token=${encodeURIComponent(token)}`,
        );
        const data = (await res.json()) as ValidarResponse;
        if (!res.ok || !data.username) {
          throw new Error(data.error ?? "Enlace inválido o expirado");
        }
        if (!cancelled) {
          setUsername(data.username);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Enlace inválido o expirado");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void validarEnlace();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center py-6 sm:py-12">
      <div className="card space-y-6 p-5 sm:p-8">
        <div className="space-y-3 text-center">
          <CoyoteLogo
            size={96}
            badge
            className="mx-auto"
            title="Coyote de Coyoacán"
          />
          <h1 className="break-words text-xl font-bold text-pin sm:text-2xl">
            <span className="sm:hidden">{APP_TITLE_SHORT}</span>
            <span className="hidden sm:inline">{APP_TITLE}</span>
          </h1>
          <p className="text-sm text-ink-secondary">Nueva contraseña</p>
        </div>

        {loading ? (
          <p className="text-center text-sm text-ink-secondary">Validando enlace…</p>
        ) : success ? (
          <div className="space-y-4">
            <div className="alert-success">
              Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión con tu nueva
              contraseña.
            </div>
            <Link href="/login" className="btn-primary btn-responsive w-full">
              Ir a iniciar sesión
            </Link>
          </div>
        ) : error && !username ? (
          <div className="space-y-4">
            <div className="alert-error">{error}</div>
            <Link href="/login/recuperar" className="btn-secondary btn-responsive w-full">
              Solicitar un nuevo enlace
            </Link>
          </div>
        ) : (
          <Formik
            initialValues={{ token, password: "", confirmPassword: "" }}
            validationSchema={restablecerContrasenaSchema}
            onSubmit={async (values, { setSubmitting }) => {
              setError(null);
              try {
                const res = await fetch("/api/auth/restablecer-contrasena", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(values),
                });
                const data = (await res.json()) as RestablecerResponse;
                if (!res.ok) {
                  throw new Error(
                    data.detalles?.join(", ") ??
                      data.error ??
                      "No se pudo restablecer la contraseña",
                  );
                }
                setSuccess(true);
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "No se pudo restablecer la contraseña",
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
                  Establece una nueva contraseña para el usuario{" "}
                  <strong className="text-ink">{username}</strong>.
                </p>

                <FormField
                  label="Nueva contraseña"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                />
                <FormField
                  label="Confirmar contraseña"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                />

                <button
                  type="submit"
                  className="btn-primary btn-responsive w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Guardando…" : "Guardar nueva contraseña"}
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
