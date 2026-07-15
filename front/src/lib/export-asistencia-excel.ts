import * as XLSX from "xlsx";
import type { DirigenteAsistenciaResumen } from "@/lib/asistencia";

function fechaArchivo() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function exportarDashboardAsistenciaExcel(
  filas: DirigenteAsistenciaResumen[],
  totales?: { eventos: number; asistencias: number; faltas: number },
) {
  const datos = filas.map((d) => ({
    Dirigente: d.nombreCompleto,
    Tipo: d.tipo,
    Colonia: d.colonia,
    "Sección electoral": d.seccionElectoral,
    "Eventos elegibles": d.eventosElegibles,
    Asistencias: d.asistencias,
    Faltas: d.faltas,
  }));

  if (totales && filas.length > 0) {
    datos.push({
      Dirigente: "TOTAL",
      Tipo: "",
      Colonia: "",
      "Sección electoral": "",
      "Eventos elegibles": totales.eventos,
      Asistencias: totales.asistencias,
      Faltas: totales.faltas,
    });
  }

  const hoja = XLSX.utils.json_to_sheet(datos);
  hoja["!cols"] = [
    { wch: 32 },
    { wch: 6 },
    { wch: 28 },
    { wch: 10 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
  ];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Asistencia");
  XLSX.writeFile(libro, `asistencia-dirigentes-${fechaArchivo()}.xlsx`);
}
