import nodemailer from "nodemailer";

async function main() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER?.trim(),
      pass: process.env.SMTP_PASS?.trim(),
    },
  });

  await transporter.verify();
  console.log("SMTP_VERIFY_OK");
  console.log("SMTP_USER", process.env.SMTP_USER);
}

main().catch((err) => {
  console.error("SMTP_VERIFY_FAIL", err instanceof Error ? err.message : err);
  process.exit(1);
});
