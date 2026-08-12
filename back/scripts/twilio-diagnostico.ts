import "dotenv/config";

const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
const token = process.env.TWILIO_AUTH_TOKEN?.trim();

function authHeader() {
  return { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` };
}

async function main() {
  if (!sid || !token) throw new Error("Twilio no configurado");

  const accRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
    headers: authHeader(),
  });
  const acc = (await accRes.json()) as Record<string, unknown>;
  console.log("=== Cuenta ===");
  console.log("status:", acc.status);
  console.log("type:", acc.type);
  console.log("friendly_name:", acc.friendly_name);

  const balRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Balance.json`, {
    headers: authHeader(),
  });
  if (balRes.ok) {
    const bal = (await balRes.json()) as { balance?: string; currency?: string };
    console.log("balance:", bal.balance, bal.currency);
  }

  const usageRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Usage/Records/ThisMonth.json?Category=channels-whatsapp-outbound`,
    { headers: authHeader() },
  );
  if (usageRes.ok) {
    const usage = (await usageRes.json()) as { usage_records?: Array<{ count?: string; usage?: string }> };
    console.log("whatsapp outbound this month:", usage.usage_records?.[0] ?? "none");
  }

  // Intentar enviar mensaje de prueba (solo diagnóstico; requiere teléfono como arg)
  const telefono = process.argv[2];
  if (telefono) {
    const digits = telefono.replace(/\D/g, "");
    const e164 = digits.length === 10 ? `+52${digits}` : digits.startsWith("52") ? `+${digits}` : null;
    if (!e164) {
      console.error("Teléfono inválido. Usa 10 dígitos MX.");
      process.exit(1);
    }

    const params = new URLSearchParams({
      To: `whatsapp:${e164}`,
      From: process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886",
      Body: "Diagnóstico Control: si recibes esto, el sandbox está activo para tu número.",
    });

    const msgRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const msg = (await msgRes.json()) as {
      sid?: string;
      status?: string;
      error_code?: number;
      message?: string;
      code?: number;
    };
    console.log("\n=== Envío de prueba ===");
    console.log(JSON.stringify(msg, null, 2));
  } else {
    console.log("\nPara probar envío: npx tsx scripts/twilio-diagnostico.ts 5512345678");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
