import "dotenv/config";
import { faltantesWhatsApp, whatsAppListo, whatsAppProveedor } from "../src/lib/comunicacion/config.js";
import { verificarWhatsApp } from "../src/lib/comunicacion/telefono.js";

async function main() {
  const prov = whatsAppProveedor();
  console.log("WHATSAPP_PROVEEDOR", prov ?? "ninguno");

  const faltantes = faltantesWhatsApp();
  if (faltantes.length > 0) {
    console.error("FALTAN:", faltantes.join(", "));
    process.exit(1);
  }

  const verify = await verificarWhatsApp();
  if (!verify.ok) {
    console.error("WHATSAPP_VERIFY_FAIL", verify.error);
    process.exit(1);
  }

  console.log("WHATSAPP_VERIFY_OK");
  console.log("WHATSAPP_LISTO", whatsAppListo());
  if (verify.proveedorId) console.log("WHATSAPP_FROM", verify.proveedorId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
