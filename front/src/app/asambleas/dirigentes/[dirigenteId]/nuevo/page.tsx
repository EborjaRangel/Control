"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function NuevaAsambleaDirigenteRedirectPage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();

  useEffect(() => {
    router.replace(isAdmin ? "/asambleas/nuevo" : `/asambleas/dirigentes/${dirigenteId}`);
  }, [dirigenteId, isAdmin, router]);

  return (
    <div className="flex items-center gap-3 text-ink-secondary">
      <span className="size-5 animate-pulse rounded-full bg-pin-light" />
      Redirigiendo…
    </div>
  );
}
