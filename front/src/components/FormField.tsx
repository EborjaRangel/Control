"use client";

import { useField, useFormikContext } from "formik";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

function fieldTextValue(value: unknown): string {
  return value == null ? "" : String(value);
}

function useShowFieldError(meta: { touched: boolean; error?: string }) {
  const { submitCount } = useFormikContext();
  return Boolean(meta.error && (meta.touched || submitCount > 0));
}

type FormFieldProps = {
  label: string;
  name: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function FormField({ label, name, className, ...props }: FormFieldProps) {
  const [field, meta] = useField(name);
  const hasError = useShowFieldError(meta);

  return (
    <label className="label">
      {label}
      <input
        {...field}
        {...props}
        id={name}
        value={fieldTextValue(field.value)}
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
