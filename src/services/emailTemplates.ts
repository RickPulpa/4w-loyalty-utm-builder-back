interface TwoFactorEmailInput {
  name: string;
  code: string;
  ttlMinutes: number;
  sessionDays: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Correo con el código de verificación (2FA). HTML con tablas y estilos inline para Gmail/Outlook. */
export function renderTwoFactorEmail({ name, code, ttlMinutes, sessionDays }: TwoFactorEmailInput): RenderedEmail {
  const firstName = escapeHtml(name.trim().split(/\s+/)[0] || "");
  const greeting = firstName ? `Hola ${firstName},` : "Hola,";
  const spacedCode = code.split("").join(" ");

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tu código de acceso</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#171717;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Tu código de acceso es ${code}. Vence en ${ttlMinutes} minutos.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="background:#000000;padding:20px 28px;">
              <span style="color:#ffffff;font-size:16px;font-weight:bold;">UTM Builder</span>
              <span style="color:#a1a1aa;font-size:16px;"> &nbsp;Honda Loyalty</span>
            </td>
          </tr>
          <tr>
            <td style="background:#dc2626;height:4px;line-height:4px;font-size:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#171717;">${greeting}</h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;">
                Usa este código para terminar de iniciar sesión. Vence en <strong>${ttlMinutes} minutos</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 28px;">
              <div style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:20px 12px;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:bold;letter-spacing:6px;color:#dc2626;">${spacedCode}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#52525b;">
                Una vez dentro, tu sesión se mantiene activa por <strong>${sessionDays} días</strong>; después te pediremos un código nuevo.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#52525b;">
                Si no intentaste iniciar sesión, ignora este correo y avisa a tu administrador. Nunca compartas este código con nadie.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:16px 28px;font-size:12px;color:#a1a1aa;">
              Honda Autos Perú · UTM Builder · Mensaje automático, no respondas a este correo.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    greeting,
    "",
    `Tu código de acceso a UTM Builder (Honda Loyalty) es: ${code}`,
    `Vence en ${ttlMinutes} minutos.`,
    "",
    `Una vez dentro, tu sesión dura ${sessionDays} días; después te pediremos un código nuevo.`,
    "Si no intentaste iniciar sesión, ignora este correo y avisa a tu administrador.",
    "Nunca compartas este código con nadie.",
  ].join("\n");

  return { subject: `Tu código de acceso: ${code}`, html, text };
}
