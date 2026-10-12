"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampanaDifusionAdminForm } from "@/components/CampanaDifusionAdminForm";
import { useAuth } from "@/components/AuthProvider";

export default function NuevaCampanaDifusionPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nueva campaña de difusión</h1>
          <p className="page-subtitle">Los dirigentes podrán registrar fotos mientras la campaña esté activa.</p>
        </div>
      </div>
      <CampanaDifusionAdminForm
        onSuccess={(c) => router.push(`/difusion/${c.id}`)}
        onCancel={() => router.push("/difusion")}
      />
      <Link href="/difusion" className="btn-ghost btn-responsive">
        Volver
      </Link>
    </div>
  );
}
