async function main() {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="place_of_worship"](19.325,-99.128,19.345,-99.108);
      way["amenity"="place_of_worship"](19.325,-99.128,19.345,-99.108);
    );
    out center 30;
  `;
  const r = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const j = (await r.json()) as {
    elements: { tags?: { name?: string }; lat?: number; lon?: number; center?: { lat: number; lon: number } }[];
  };
  for (const el of j.elements) {
    const name = el.tags?.name ?? "?";
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!lat || !lon) continue;
    if (/culhuac|san juan|santa ana|magdalena|san francisco/i.test(name)) {
      console.log(`${lat.toFixed(7)}, ${lon.toFixed(7)} — ${name}`);
    }
  }
}

main().catch(console.error);
