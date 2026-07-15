const year = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="footer-mobile-nav mt-auto border-t border-line bg-surface sm:pb-0">
      <div className="page-container py-4 text-center text-xs text-ink-secondary sm:text-left">
        <p>© {year}. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
