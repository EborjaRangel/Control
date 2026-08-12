import "dotenv/config";

async function twilioGet(path: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) throw new Error("Twilio no configurado");

  const res = await fetch(`https://messaging.twilio.com/v1${path}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
    },
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function main() {
  const account = await twilioGet(`/Services`);
  console.log("Messaging Services", account.status);
  console.log(account.body.slice(0, 800));

  const acc = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}.json`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
        ).toString("base64")}`,
      },
    },
  );
  const accData = (await acc.json()) as {
    status?: string;
    type?: string;
    friendly_name?: string;
  };
  console.log("\nCuenta:", accData.friendly_name, "| status:", accData.status, "| type:", accData.type);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
