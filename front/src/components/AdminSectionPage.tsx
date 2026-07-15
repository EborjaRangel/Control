"use client";

import { useAuth } from "@/components/AuthProvider";

type Props = {
  title: string;
  subtitle?: string;
};

export function AdminSectionPage({ title, subtitle }: Props) {
  const { isStaff } = useAuth();
  if (!isStaff) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      <div className="card py-12 text-center">
        <p className="font-semibold text-ink">Módulo en construcción</p>
        <p className="mt-1 text-sm text-ink-secondary">
          Esta sección estará disponible próximamente.
        </p>
      </div>
    </div>
  );
}
