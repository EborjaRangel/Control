const qs = [
  "Capilla San Juan Culhuacán, Coyoacán, Ciudad de México",
  "Parroquia Santa Ana Culhuacán, Coyoacán, Ciudad de México",
  "Templo San Francisco Culhuacán, Coyoacán, Ciudad de México",
  "Barrio La Magdalena Culhuacán, Coyoacán, Ciudad de México",
];

async function main() {
  for (const q of qs) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const r = await fetch(url, { headers: { "User-Agent": "control-electoral-coyoacan/1.0" } });
    const j = (await r.json()) as { lat: string; lon: string; display_name: string }[];
    console.log(q);
    console.log(j[0] ? `  ${j[0].lat}, ${j[0].lon} — ${j[0].display_name}` : "  (sin resultado)");
    await new Promise((res) => setTimeout(res, 1200));
  }
}

main().catch(console.error);
