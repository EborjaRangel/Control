const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

export const CENTRO_COYOACAN = { lat: 19.346, lng: -99.162 };

type GeocodeFeature = {
  place_name?: string;
};

type GeocodeResponse = {
  features?: GeocodeFeature[];
};

export async function reverseGeocodeMapbox(lng: number, lat: number): Promise<string> {
  if (!MAPBOX_TOKEN) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`,
  );
  url.searchParams.set("language", "es");
  url.searchParams.set("limit", "1");
  url.searchParams.set("access_token", MAPBOX_TOKEN);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error("No se pudo obtener la dirección");
  }

  const data = (await res.json()) as GeocodeResponse;
  const place = data.features?.[0]?.place_name?.trim();
  if (!place) {
    throw new Error("No se encontró dirección para esta ubicación");
  }
  return place;
}
