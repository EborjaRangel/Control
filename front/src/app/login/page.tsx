"use client";

import { useState } from "react";
import { Form, Formik } from "formik";
import { useAuth } from "@/components/AuthProvider";
import { CoyoteLogo } from "@/components/CoyoteLogo";
import { FormField } from "@/components/FormField";
import { loginSchema } from "@/lib/auth";
import { APP_TITLE, APP_TITLE_SHORT } from "@/lib/site";

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

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
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
