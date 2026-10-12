"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NuevaEntregaMaterialForm } from "@/components/NuevaEntregaMaterialForm";
import { useAuth } from "@/components/AuthProvider";

export default function NuevaEntregaMaterialPage() {
  const router = useRouter();
  const { isStaff } = useAuth();

  if (!isStaff) return null;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nueva entrega de material</h1>
          <p className="page-subtitle">Convoca dirigentes, asigna materiales y abre la ventana de entrega</p>
        </div>
        <Link href="/material" className="btn-ghost btn-responsive">
          Volver
        </Link>
      </div>

      <NuevaEntregaMaterialForm
        onSuccess={(id) => router.push(`/material/eventos/${id}`)}
        onCancel={() => router.push("/material")}
      />
    </div>
  );
}
