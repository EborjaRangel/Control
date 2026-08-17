import { BRAND_SIGNATURE } from "@/lib/site";

const year = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="page-container flex flex-col items-center justify-between gap-2 py-4 text-center text-xs text-ink-secondary sm:flex-row sm:text-left">
        <p className="font-semibold tracking-wide text-pin">{BRAND_SIGNATURE}</p>
        <p>© {year}. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
