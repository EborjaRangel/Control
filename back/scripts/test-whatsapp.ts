import "dotenv/config";
import { enviarWhatsApp } from "../src/lib/comunicacion/telefono.js";

async function main() {
  const telefono = process.argv[2];
  const mensaje =
    process.argv[3] ??
    "Prueba Control Coyoacán: convocatoria por WhatsApp vía Twilio.";

  if (!telefono) {
    console.error("Usage: test-whatsapp.ts <telefono-10-digitos> [mensaje]");
    process.exit(1);
  }

  const result = await enviarWhatsApp({ telefono, body: mensaje });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
