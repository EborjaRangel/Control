"use client";

import type { ReactNode } from "react";

const FOLIO_SERVICIO_URBANO = /SU-\d{8}-\d{4}/g;
const ESTATUS_SERVICIO_URBANO = /\b(RECIBIDO|ATENDIDO)\b/g;

function resaltarFragmento(texto: string, indice: number): ReactNode[] {
  const partes: ReactNode[] = [];
  let key = indice;

  const tokens: { index: number; length: number }[] = [];

  for (const match of texto.matchAll(FOLIO_SERVICIO_URBANO)) {
    if (match.index != null) {
      tokens.push({ index: match.index, length: match[0].length });
    }
  }
  for (const match of texto.matchAll(ESTATUS_SERVICIO_URBANO)) {
    if (match.index != null) {
      tokens.push({ index: match.index, length: match[0].length });
    }
  }

  tokens.sort((a, b) => a.index - b.index);

  let cursor = 0;
  for (const token of tokens) {
    if (token.index < cursor) continue;
    if (token.index > cursor) {
      partes.push(texto.slice(cursor, token.index));
    }
    const valor = texto.slice(token.index, token.index + token.length);
    partes.push(
      <strong key={`${key++}-${token.index}`} className="font-bold text-notif">
        {valor}
      </strong>,
    );
    cursor = token.index + token.length;
  }

  if (cursor < texto.length) {
    partes.push(texto.slice(cursor));
  }

  return partes.length > 0 ? partes : [texto];
}

export function NotificacionMensaje({ mensaje }: { mensaje: string }) {
  const tieneResaltado = /SU-\d{8}-\d{4}|\b(RECIBIDO|ATENDIDO)\b/.test(mensaje);
  if (!tieneResaltado) {
    return <>{mensaje}</>;
  }
  return <>{resaltarFragmento(mensaje, 0)}</>;
}
