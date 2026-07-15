// Catálogo de colonias de la alcaldía Coyoacán con su código postal.
// Fuente: SEPOMEX (Correos de México) — CPdescarga.txt — generado 2026-06-14
// Alcaldía: Coyoacán (c_mnpio 003, Ciudad de México)
// Total: 116 asentamientos, 83 códigos postales
// Regenerar: npm run geo:import-colonias -w control-back

import { normalizarTextoGuardado } from "./normalizar-texto.js";

export type Colonia = {
  nombre: string;
  cp: string;
  lat: number;
  lng: number;
};

export const COLONIAS_COYOACAN: Colonia[] = [
  { nombre: "Villa Coyoacán", cp: "04000", lat: 19.3054012, lng: -99.1692710 },
  { nombre: "Barrio Santa Catarina", cp: "04010", lat: 19.3501320, lng: -99.1746519 },
  { nombre: "Barrio La Concepción", cp: "04020", lat: 19.3446688, lng: -99.1574032 },
  { nombre: "Barrio San Lucas", cp: "04030", lat: 19.3156259, lng: -99.1329683 },
  { nombre: "Parque San Andrés", cp: "04040", lat: 19.3453938, lng: -99.1482787 },
  { nombre: "Del Carmen", cp: "04100", lat: 19.3542897, lng: -99.1617971 },
  { nombre: "San Diego Churubusco", cp: "04120", lat: 19.3557270, lng: -99.1490005 },
  { nombre: "San Mateo", cp: "04120", lat: 19.3557270, lng: -99.1490005 },
  { nombre: "Campestre Churubusco", cp: "04200", lat: 19.3461880, lng: -99.1356291 },
  { nombre: "Churubusco Country Club", cp: "04210", lat: 19.3461880, lng: -99.1356291 },
  { nombre: "Prado Churubusco", cp: "04230", lat: 19.3578860, lng: -99.1230161 },
  { nombre: "Ermita Churubusco", cp: "04239", lat: 19.3578860, lng: -99.1230161 },
  { nombre: "Hermosillo", cp: "04240", lat: 19.3460030, lng: -99.1284212 },
  { nombre: "Paseos de Taxqueña", cp: "04250", lat: 19.3452007, lng: -99.1247366 },
  { nombre: "San Francisco Culhuacán Barrio de La Magdalena", cp: "04260", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "San Francisco Culhuacán Barrio de San Francisco", cp: "04260", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "San Francisco Culhuacán Barrio de San Juan", cp: "04260", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "San Francisco Culhuacán Barrio de Santa Ana", cp: "04260", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Santa Martha del Sur Quetzalcoatl", cp: "04270", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Ajusco", cp: "04300", lat: 19.3190897, lng: -99.1609606 },
  { nombre: "Romero de Terreros", cp: "04310", lat: 19.3457792, lng: -99.1698209 },
  { nombre: "Barrio Oxtopulco Universidad", cp: "04318", lat: 19.3445064, lng: -99.1791524 },
  { nombre: "Fortín de Chimalistac", cp: "04319", lat: 19.3432606, lng: -99.1840895 },
  { nombre: "Torres de Chimalistac", cp: "04319", lat: 19.3403218, lng: -99.1845031 },
  { nombre: "Cuadrante de San Francisco", cp: "04320", lat: 19.3432060, lng: -99.1642939 },
  { nombre: "Pedregal de San Francisco", cp: "04320", lat: 19.3432060, lng: -99.1642939 },
  { nombre: "Romero de Terreros", cp: "04320", lat: 19.3457792, lng: -99.1698209 },
  { nombre: "Villa de San Francisco", cp: "04326", lat: 19.3397700, lng: -99.1617800 },
  { nombre: "Barrio del Niño Jesús", cp: "04330", lat: 19.3420808, lng: -99.1585334 },
  { nombre: "El Rosedal", cp: "04330", lat: 19.3420808, lng: -99.1585334 },
  { nombre: "Pedregal de Coyoacán", cp: "04330", lat: 19.3420808, lng: -99.1585334 },
  { nombre: "Pueblo de los Reyes", cp: "04330", lat: 19.3420808, lng: -99.1585334 },
  { nombre: "Copilco El Bajo", cp: "04340", lat: 19.3377288, lng: -99.1849908 },
  { nombre: "Copilco Universidad ISSSTE", cp: "04340", lat: 19.3377288, lng: -99.1849908 },
  { nombre: "Copilco", cp: "04350", lat: 19.3360586, lng: -99.1770655 },
  { nombre: "Integración Latinoamericana", cp: "04350", lat: 19.3377970, lng: -99.1785126 },
  { nombre: "Villas Copilco", cp: "04350", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Empleados Federales", cp: "04359", lat: 19.3377250, lng: -99.1823759 },
  { nombre: "Copilco El Alto", cp: "04360", lat: 19.3215970, lng: -99.1849259 },
  { nombre: "Copilco Universidad", cp: "04360", lat: 19.3215970, lng: -99.1849259 },
  { nombre: "Residencial la Cantera", cp: "04368", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Pedregal de Santo Domingo", cp: "04369", lat: 19.3271575, lng: -99.1678565 },
  { nombre: "Atlántida", cp: "04370", lat: 19.3404436, lng: -99.1466836 },
  { nombre: "Ciudad Jardín", cp: "04370", lat: 19.3360233, lng: -99.1446028 },
  { nombre: "El Rosario", cp: "04380", lat: 19.3420808, lng: -99.1585334 },
  { nombre: "Pueblo La Candelaria", cp: "04380", lat: 19.3420808, lng: -99.1585334 },
  { nombre: "Huayamilpas", cp: "04390", lat: 19.3277094, lng: -99.1517279 },
  { nombre: "Nueva Díaz Ordaz", cp: "04390", lat: 19.3257050, lng: -99.1490746 },
  { nombre: "Educación", cp: "04400", lat: 19.3354120, lng: -99.1321437 },
  { nombre: "Petrolera Taxqueña", cp: "04410", lat: 19.3390658, lng: -99.1332707 },
  { nombre: "Tlalpan FOVISSSTE", cp: "04410", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Ex-Ejido de San Francisco Culhuacán", cp: "04420", lat: 19.3228085, lng: -99.1036495 },
  { nombre: "Culhuacán CTM Sección I", cp: "04440", lat: 19.3250639, lng: -99.1100052 },
  { nombre: "Culhuacán CTM Sección II", cp: "04440", lat: 19.3301075, lng: -99.1245258 },
  { nombre: "Culhuacán CTM Sección V", cp: "04440", lat: 19.3250639, lng: -99.1100052 },
  { nombre: "El Centinela", cp: "04450", lat: 19.3359880, lng: -99.1397960 },
  { nombre: "Avante", cp: "04460", lat: 19.3299678, lng: -99.1386190 },
  { nombre: "Presidentes Ejidales 1a Sección", cp: "04470", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Presidentes Ejidales 2a Sección", cp: "04470", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Culhuacán CTM CROC", cp: "04480", lat: 19.3301075, lng: -99.1245258 },
  { nombre: "Culhuacán CTM Sección III", cp: "04480", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Culhuacán CTM Sección VI", cp: "04480", lat: 19.3301075, lng: -99.1245258 },
  { nombre: "Culhuacán CTM Sección X-A", cp: "04480", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Culhuacán CTM Sección VII", cp: "04489", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Culhuacán CTM Canal Nacional", cp: "04490", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Culhuacán CTM Sección Piloto", cp: "04490", lat: 19.3244888, lng: -99.1138655 },
  { nombre: "Jardines del Pedregal de San Ángel", cp: "04500", lat: 19.3067981, lng: -99.1981595 },
  { nombre: "Universidad Nacional Autónoma de México", cp: "04510", lat: 19.3229326, lng: -99.1884887 },
  { nombre: "La Otra Banda", cp: "04519", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Insurgentes Cuicuilco", cp: "04530", lat: 19.3032950, lng: -99.1850390 },
  { nombre: "Pedregal de Santa Úrsula", cp: "04600", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Xotepingo", cp: "04610", lat: 19.3341407, lng: -99.1427983 },
  { nombre: "Pueblo de San Pablo Tepetlapa", cp: "04620", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Adolfo Ruiz Cortínes", cp: "04630", lat: 19.3052509, lng: -99.2030859 },
  { nombre: "El Reloj", cp: "04640", lat: 19.3181581, lng: -99.1392557 },
  { nombre: "Pueblo de Santa Úrsula Coapa", cp: "04650", lat: 19.3089302, lng: -99.1423807 },
  { nombre: "Joyas del Pedregal", cp: "04660", lat: 19.3064286, lng: -99.1584418 },
  { nombre: "Pedregal de La Zorra", cp: "04660", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Pedregal de Carrasco", cp: "04700", lat: 19.3060161, lng: -99.1757027 },
  { nombre: "Olímpica", cp: "04710", lat: 19.3044491, lng: -99.1701792 },
  { nombre: "Vistas del Maurel", cp: "04718", lat: 19.3051206, lng: -99.1729913 },
  { nombre: "Pedregal del Sur", cp: "04719", lat: 19.3094651, lng: -99.1870701 },
  { nombre: "Bosques de Tetlameya", cp: "04730", lat: 19.2989654, lng: -99.1539411 },
  { nombre: "Cantil del Pedregal", cp: "04730", lat: 19.2989654, lng: -99.1539411 },
  { nombre: "Modulo Social Imán", cp: "04738", lat: 19.3062682, lng: -99.1672964 },
  { nombre: "El Caracol", cp: "04739", lat: 19.3039254, lng: -99.1628908 },
  { nombre: "Alianza Popular Revolucionaria", cp: "04800", lat: 19.3145300, lng: -99.1191707 },
  { nombre: "Los Cedros", cp: "04800", lat: 19.3195006, lng: -99.1236760 },
  { nombre: "Prados de Coyoacán", cp: "04810", lat: 19.3189266, lng: -99.1323988 },
  { nombre: "Emiliano Zapata", cp: "04815", lat: 19.3254699, lng: -99.1374649 },
  { nombre: "Los Cipreses", cp: "04830", lat: 19.3190039, lng: -99.1278899 },
  { nombre: "Ex-Ejido de San Pablo Tepetlapa", cp: "04840", lat: 19.3298238, lng: -99.1292865 },
  { nombre: "Sector Marina", cp: "04849", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Espartaco", cp: "04870", lat: 19.3177885, lng: -99.1361253 },
  { nombre: "Jardines de Coyoacán", cp: "04890", lat: 19.3141139, lng: -99.1268723 },
  { nombre: "Los Olivos", cp: "04890", lat: 19.3141139, lng: -99.1268723 },
  { nombre: "El Parque de Coyoacán", cp: "04899", lat: 19.3109521, lng: -99.1312973 },
  { nombre: "La Virgen", cp: "04908", lat: 19.3206683, lng: -99.1136424 },
  { nombre: "Culhuacán CTM Sección IX-A", cp: "04909", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Culhuacán CTM Sección IX-B", cp: "04909", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Culhuacán CTM Sección VIII", cp: "04909", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Carmen Serdán", cp: "04910", lat: 19.3199655, lng: -99.1083290 },
  { nombre: "Cafetales", cp: "04918", lat: 19.3338871, lng: -99.1131355 },
  { nombre: "Emiliano Zapata Fraccionamiento Popular", cp: "04919", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Los Girasoles", cp: "04920", lat: 19.3078158, lng: -99.1278075 },
  { nombre: "Las Campanas", cp: "04929", lat: 19.3078195, lng: -99.1199135 },
  { nombre: "Santa Cecilia", cp: "04930", lat: 19.3072364, lng: -99.1141970 },
  { nombre: "Campestre Coyoacán", cp: "04938", lat: 19.3436278, lng: -99.1400287 },
  { nombre: "Culhuacán CTM Sección X", cp: "04939", lat: 19.3158024, lng: -99.1032911 },
  { nombre: "Los Sauces", cp: "04940", lat: 19.3041646, lng: -99.1166156 },
  { nombre: "El Mirador", cp: "04950", lat: 19.3025771, lng: -99.1065607 },
  { nombre: "Villa Quietud", cp: "04960", lat: 19.3035973, lng: -99.1057616 },
  { nombre: "Haciendas de Coyoacán", cp: "04970", lat: 19.3460000, lng: -99.1620000 },
  { nombre: "Ex-Ejido de Santa Úrsula Coapa", cp: "04980", lat: 19.3041152, lng: -99.1532138 },
  { nombre: "Ex-Hacienda Coapa", cp: "04980", lat: 19.3224823, lng: -99.1333434 },
  { nombre: "Viejo Ejido de Santa Úrsula Coapa", cp: "04980", lat: 19.3044945, lng: -99.1416934 },
];

const colByNombre = new Map(COLONIAS_COYOACAN.map((c) => [c.nombre, c]));
const coloniasByCp = new Map<string, Colonia[]>();

function coloniasConNombre(nombre: string): Colonia[] {
  const exact = COLONIAS_COYOACAN.filter((c) => c.nombre === nombre);
  if (exact.length > 0) return exact;
  const norm = normalizarTextoGuardado(nombre);
  return COLONIAS_COYOACAN.filter((c) => normalizarTextoGuardado(c.nombre) === norm);
}

export function nombreColoniaCatalogo(nombre: string): string {
  return coloniasConNombre(nombre)[0]?.nombre ?? nombre;
}

export function cpsDeColonia(nombre: string): string[] {
  const cps = new Set(coloniasConNombre(nombre).map((c) => c.cp));
  return [...cps].sort();
}

/** Valores equivalentes (catálogo y normalizado) para filtrar en BD. */
export function variantesColoniaParaBusqueda(coloniaQuery: string): string[] {
  const catalogo = nombreColoniaCatalogo(coloniaQuery);
  const normalizado = normalizarTextoGuardado(catalogo);
  return [...new Set([catalogo, normalizado, coloniaQuery.trim()].filter(Boolean))];
}

for (const colonia of COLONIAS_COYOACAN) {
  const list = coloniasByCp.get(colonia.cp) ?? [];
  list.push(colonia);
  coloniasByCp.set(colonia.cp, list);
}

export const CODIGOS_POSTALES_COYOACAN = [...coloniasByCp.keys()].sort();
export const TOTAL_COLONIAS_COYOACAN = COLONIAS_COYOACAN.length;

export const NOMBRES_COLONIAS_COYOACAN = [...new Set(COLONIAS_COYOACAN.map((c) => c.nombre))].sort(
  (a, b) => a.localeCompare(b, "es"),
);

export const COYOACAN_CENTRO = { lat: 19.346, lng: -99.162 };

export function cpDeColonia(nombre: string): string | null {
  return coloniasConNombre(nombre)[0]?.cp ?? null;
}

export function puntoDeColonia(nombre: string): { lat: number; lng: number } | null {
  const c = coloniasConNombre(nombre)[0];
  if (!c) return null;
  return { lat: c.lat, lng: c.lng };
}

export function coloniasPorCp(cp: string): Colonia[] {
  return coloniasByCp.get(cp) ?? [];
}

export function esCodigoPostalValido(cp: string): boolean {
  return coloniasByCp.has(cp);
}

export function esColoniaValida(nombre: string): boolean {
  return coloniasConNombre(nombre).length > 0;
}

export function coloniaCoincideConCp(nombre: string, cp: string): boolean {
  return coloniasConNombre(nombre).some((c) => c.cp === cp);
}

export function coloniasParaSelect(cp: string, coloniaActual?: string | null): Colonia[] {
  const delCp = coloniasPorCp(cp);
  const actualCatalogo = coloniaActual ? nombreColoniaCatalogo(coloniaActual) : null;
  if (!actualCatalogo || delCp.some((c) => c.nombre === actualCatalogo)) {
    return delCp;
  }
  const legacy = coloniasConNombre(actualCatalogo)[0];
  if (legacy) return [legacy, ...delCp];
  return [
    { nombre: actualCatalogo, cp, lat: COYOACAN_CENTRO.lat, lng: COYOACAN_CENTRO.lng },
    ...delCp,
  ];
}

export function coloniaPorDefectoDeCp(cp: string): string {
  const colonias = coloniasPorCp(cp);
  return colonias.length === 1 ? colonias[0].nombre : "";
}
