import { enviarCorreoRecuperacion } from "../src/lib/password-reset.js";

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: test-send-recovery.ts <correo>");
    process.exit(1);
  }

  const result = await enviarCorreoRecuperacion({
    to,
    username: "test-user",
    token: "test-token-local",
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
