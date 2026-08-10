"use client";

import { useField, useFormikContext } from "formik";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { normalizarNombrePersonaEnVivo } from "@/lib/normalizar-texto";
import { formatearFechaNacimientoEnVivo } from "@/lib/fecha-nacimiento";
import { formatearMontoEnVivo, quitarCerosDerechaMonto } from "@/lib/monto";

function fieldTextValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value);
}

function useShowFieldError(meta: { touched: boolean; error?: string }) {
  const { submitCount } = useFormikContext();
  return Boolean(meta.error && (meta.touched || submitCount > 0));
}

type FormFieldProps = {
  label: string;
  name: string;
  /** Convierte a mayúsculas sin acentos mientras se escribe (nombre y apellidos). */
  nombrePersona?: boolean;
  /** Formato DD/MM/AAAA con barras automáticas. */
  fechaNacimiento?: boolean;
  /** Monto: sin ceros a la derecha en decimales (máx. 2). */
  monto?: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

export function FormField({
  label,
  name,
  className,
  nombrePersona,
  fechaNacimiento,
  monto,
  onChange,
  onBlur,
  type,
  inputMode,
  ...props
}: FormFieldProps) {
  const [field, meta, helpers] = useField(name);
  const hasError = useShowFieldError(meta);
  const resolvedType = monto || fechaNacimiento ? "text" : type;
  const resolvedInputMode = monto
    ? "decimal"
    : fechaNacimiento
      ? "numeric"
      : inputMode;

  return (
    <label className="label">
      {label}
      <input
        {...field}
        {...props}
        id={name}
        type={resolvedType}
        inputMode={resolvedInputMode}
        value={fieldTextValue(field.value)}
        onChange={(e) => {
          let value = e.target.value;
          if (nombrePersona) value = normalizarNombrePersonaEnVivo(value);
          else if (fechaNacimiento) value = formatearFechaNacimientoEnVivo(value);
          else if (monto) value = formatearMontoEnVivo(value);
          void helpers.setValue(value);
          onChange?.({ ...e, target: { ...e.target, value } });
        }}
        onBlur={(e) => {
          if (monto) {
            const value = quitarCerosDerechaMonto(e.target.value);
            void helpers.setValue(value === "" ? "" : value);
            void helpers.setTouched(true);
          } else {
            field.onBlur(e);
          }
          onBlur?.(e);
        }}
        className={cn("input", hasError && "input-error", className)}
      />
      {hasError ? <p className="field-error">{meta.error}</p> : null}
    </label>
  );
}

type FormSelectProps = {
  label: string;
  name: string;
  children: React.ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function FormSelect({
  label,
  name,
  children,
  className,
  onChange,
  ...props
}: FormSelectProps) {
  const [field, meta] = useField(name);
  const hasError = useShowFieldError(meta);

  return (
    <label className="label">
      {label}
      <select
        {...field}
        {...props}
        id={name}
        value={fieldTextValue(field.value)}
        onChange={(e) => {
          field.onChange(e);
          onChange?.(e);
        }}
        className={cn("input", hasError && "input-error", className)}
      >
        {children}
      </select>
      {hasError ? <p className="field-error">{meta.error}</p> : null}
    </label>
  );
}

type FormTextareaProps = {
  label: string;
  name: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function FormTextarea({ label, name, className, ...props }: FormTextareaProps) {
  const [field, meta] = useField(name);
  const hasError = useShowFieldError(meta);

  return (
    <label className="label">
      {label}
      <textarea
        {...field}
        {...props}
        id={name}
        value={fieldTextValue(field.value)}
        className={cn("input-area", hasError && "input-error", className)}
      />
      {hasError ? <p className="field-error">{meta.error}</p> : null}
    </label>
  );
}

export function FormCheckbox({
  label,
  name,
}: {
  label: string;
  name: string;
}) {
  const [field, meta] = useField({ name, type: "checkbox" });
  const hasError = useShowFieldError(meta);

  return (
    <label className="flex items-center gap-2.5 text-sm font-medium text-ink-secondary">
      <input {...field} id={name} type="checkbox" className="checkbox-pin" />
      {label}
      {hasError ? <p className="field-error">{meta.error}</p> : null}
    </label>
  );
}
