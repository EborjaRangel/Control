"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NuevoDetectadoRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/detectados");
  }, [router]);

  return (
    <div className="flex items-center gap-3 text-ink-secondary">
      <span className="size-5 animate-pulse rounded-full bg-pin-light" />
      Redirigiendo…
    </div>
  );
}
