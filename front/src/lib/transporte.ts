export type EventoTransporteResumenDTO = {
  id: string;
  titulo: string;
  fecha: string;
  estado: string;
};

export type RegistroTransporteFotoDTO = {
  id: string;
  url: string;
  orden: number;
};

export type RegistroTransporteDTO = {
  id: string;
  eventoId: string;
  eventoTitulo: string;
  eventoFecha: string;
  lat: number;
  lng: number;
  tipoUnidad: "CAMION" | "MICROBUS";
  tipoUnidadLabel: string;
  placas: string;
  nombreChofer: string;
  telefonoChofer: string;
  tipoRecorrido: "IDA" | "VUELTA" | "IDA_Y_VUELTA";
  tipoRecorridoLabel: string;
  puntoEntrega: string;
  fotos: RegistroTransporteFotoDTO[];
  registradoAt: string;
};

export type RegistroTransporteAdminDTO = RegistroTransporteDTO & {
  dirigenteId: string;
  dirigenteNombre: string;
  dirigenteNumeroFicha: number | null;
  dirigenteColonia: string;
  dirigenteSeccion: string;
};

export type DirigenteTransportePanelDTO = {
  dirigente: {
    id: string;
    numeroFicha: number | null;
    nombreCompleto: string;
    tipo: string;
    colonia: string;
    seccionElectoral: string;
    activo: boolean;
    status: string;
  };
  totalRegistros: number;
  eventosAbiertos: EventoTransporteResumenDTO[];
  registros: RegistroTransporteDTO[];
};

export function formatRegistroTransporteFecha(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
