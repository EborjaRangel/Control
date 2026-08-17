"use client";

import Link from "next/link";
import { useState } from "react";
import { Form, Formik } from "formik";
import { useAuth } from "@/components/AuthProvider";
import { AxisLogo } from "@/components/AxisLogo";
import { FormField } from "@/components/FormField";
import { loginSchema } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center py-6 sm:py-12">
      <div className="card space-y-6 p-5 sm:p-8">
        <div className="space-y-3 text-center">
          <AxisLogo size={168} badge className="mx-auto" />
          <h1 className="sr-only">AXIS</h1>
          <p className="text-sm text-ink-secondary">Inicia sesión para continuar</p>
        </div>

        <Formik
          initialValues={{ username: "", password: "" }}
          validationSchema={loginSchema}
          onSubmit={async (values, { setSubmitting }) => {
            setError(null);
            try {
              await login(values.username, values.password);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Error al iniciar sesión");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              {error ? <div className="alert-error">{error}</div> : null}

              <FormField
                label="Usuario"
                name="username"
                autoComplete="username"
              />
              <FormField
                label="Contraseña"
                name="password"
                type="password"
                autoComplete="current-password"
              />

              <button type="submit" className="btn-primary btn-responsive w-full" disabled={isSubmitting}>
                {isSubmitting ? "Entrando…" : "Iniciar sesión"}
              </button>

              <p className="text-center text-sm">
                <Link href="/login/recuperar" className="font-medium text-pin hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </p>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
