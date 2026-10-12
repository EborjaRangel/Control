export type CampanaDifusionDTO = {
  id: string;
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: "ACTIVA" | "CERRADA";
  estadoLabel: string;
  aceptaRegistros: boolean;
  cerradaAt: string | null;
  totalRegistros?: number;
  createdAt: string;
  updatedAt: string;
};

export type RegistroDifusionDTO = {
  id: string;
  campanaId: string;
  campanaTitulo: string | null;
  dirigenteId: string;
  dirigenteNombre: string | null;
  dirigenteTipo: string | null;
  dirigenteSeccion: string | null;
  fotoUrl: string;
  lat: number;
  lng: number;
  registradoAt: string;
};

export type DirigenteDifusionPanelDTO = {
  dirigente: {
    id: string;
    nombreCompleto: string;
    tipo: string;
    seccionElectoral: string;
    colonia: string;
    activo: boolean;
  };
  totalRegistros: number;
  campanasActivas: CampanaDifusionDTO[];
  registros: RegistroDifusionDTO[];
};

export function formatRegistroDifusionFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  });
}
