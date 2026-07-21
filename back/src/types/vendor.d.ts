declare module "adm-zip" {
  export interface IZipEntry {
    entryName: string;
    isDirectory: boolean;
    getData(): Buffer;
  }

  export default class AdmZip {
    constructor(filename?: string | Buffer);
    getEntries(): IZipEntry[];
    extractAllTo(targetPath: string, overwrite?: boolean): void;
    extractEntryTo(
      entryName: string,
      targetPath: string,
      maintainEntryPath: boolean,
      overwrite: boolean,
    ): void;
  }
}

declare module "shapefile" {
  export interface ShapefileSource {
    read(): Promise<{ done: boolean; value?: GeoJSON.Feature }>;
  }

  export function open(shp: string, dbf?: string, options?: object): Promise<ShapefileSource>;
}

declare module "proj4" {
  type Proj4Static = {
    defs(name: string, projection?: string): void;
    (from: string, to: string, coordinates: [number, number]): [number, number];
  };

  const proj4: Proj4Static;
  export default proj4;
}
