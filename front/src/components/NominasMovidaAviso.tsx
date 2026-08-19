"use client";

import Link from "next/link";

const NOMINA_APP_URL = "https://nomina-front-mu.vercel.app";

export function NominasMovidaAviso() {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-8">
      <h1 className="page-title">Nómina se captura en otra app</h1>
      <p className="page-subtitle">
        La captura y consulta de sueldos ya no está en Control. Entra a la app{" "}
        <strong>Nómina</strong> con el mismo usuario.
      </p>
      <p className="text-sm text-ink-secondary">
        App Nómina:{" "}
        <a href={NOMINA_APP_URL} className="text-pin underline" target="_blank" rel="noreferrer">
          {NOMINA_APP_URL}
        </a>
      </p>
      <Link href="/" className="btn-secondary btn-responsive">
        Volver a dirigentes
      </Link>
    </div>
  );
}
