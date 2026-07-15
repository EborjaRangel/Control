"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return (
      <main className="page-container flex min-h-dvh flex-1 flex-col justify-center py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:py-12">
        {children}
      </main>
    );
  }

  return (
    <>
      <SiteNavbar />
      <main className="page-container main-with-navbar min-w-0 flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
