export function isPaseListaPath(pathname: string) {
  return (
    pathname === "/pase" ||
    pathname.startsWith("/pase/") ||
    pathname === "/asistencia/registrar" ||
    pathname.startsWith("/asistencia/registrar/")
  );
}

export function isPaseListaLocation() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  const codigo = new URLSearchParams(window.location.search).get("c")?.trim();
  return isPaseListaPath(path) || Boolean(codigo);
}
