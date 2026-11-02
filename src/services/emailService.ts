import { env } from "../config/env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** "Nombre <correo@dominio>" -> { name, email } (SendGrid pide el remitente separado). */
function parseFrom(from: string): { name?: string; email: string } {
  const match = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim() || undefined, email: match[2].trim() };
  return { email: from.trim() };
}

async function postJson(url: string, apiKey: string, body: unknown, provider: string): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${provider} respondió ${response.status}: ${detail.slice(0, 300)}`);
  }
}

/**
 * Envía un correo por la API de Resend o SendGrid. Con EMAIL_PROVIDER=console (solo
 * fuera de producción) imprime el correo en la terminal del backend para poder probar
 * en local sin proveedor; en producción jamás se escribe el contenido en los logs.
 */
export async function sendEmail(email: OutgoingEmail): Promise<void> {
  const { provider, apiKey, from } = env.email;

  if (provider === "console") {
    if (env.isProduction) {
      throw new Error("EMAIL_PROVIDER no está configurado (resend o sendgrid) en producción.");
    }
    console.log(
      `\n[correo simulado] Para: ${email.to}\nAsunto: ${email.subject}\n\n${email.text}\n`
    );
    return;
  }

  if (!apiKey) {
    throw new Error("Falta EMAIL_API_KEY para enviar correos.");
  }

  if (provider === "resend") {
    await postJson(
      "https://api.resend.com/emails",
      apiKey,
      { from, to: [email.to], subject: email.subject, html: email.html, text: email.text },
      "Resend"
    );
    return;
  }

  const sender = parseFrom(from);
  await postJson(
    "https://api.sendgrid.com/v3/mail/send",
    apiKey,
    {
      personalizations: [{ to: [{ email: email.to }] }],
      from: sender,
      subject: email.subject,
      content: [
        { type: "text/plain", value: email.text },
        { type: "text/html", value: email.html },
      ],
    },
    "SendGrid"
  );
}
