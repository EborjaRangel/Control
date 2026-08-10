import { verificarTwilio } from "../src/lib/comunicacion/telefono.js";
import { faltantesWhatsApp, whatsAppListo } from "../src/lib/comunicacion/config.js";

async function main() {
  const faltantes = faltantesWhatsApp();
  if (faltantes.length > 0) {
    console.error("FALTAN:", faltantes.join(", "));
    process.exit(1);
  }

  const verify = await verificarTwilio();
  if (!verify.ok) {
    console.error("TWILIO_VERIFY_FAIL", verify.error);
    process.exit(1);
  }

  console.log("TWILIO_VERIFY_OK");
  console.log("WHATSAPP_FROM", process.env.TWILIO_WHATSAPP_FROM);
  console.log("WHATSAPP_LISTO", whatsAppListo());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
