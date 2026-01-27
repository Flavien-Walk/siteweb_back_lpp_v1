import nodemailer from 'nodemailer';

const creerTransport = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

/**
 * Envoie l'email de vérification avec un lien cliquable
 */
export const envoyerEmailVerification = async (
  email: string,
  prenom: string,
  token: string
): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const lienVerification = `${clientUrl}/verify-email?token=${token}`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0d0f15;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f15;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#1a1d28;border-radius:16px;border:1px solid #2a2d3a;padding:40px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <h1 style="color:#ffffff;font-size:22px;margin:0;">La Première Pierre</h1>
            </td>
          </tr>
          <tr>
            <td style="color:#a0a3b1;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 16px;">Bonjour <strong style="color:#ffffff;">${prenom}</strong>,</p>
              <p style="margin:0 0 24px;">Merci pour ton inscription ! Clique sur le bouton ci-dessous pour vérifier ton adresse email :</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="${lienVerification}" style="display:inline-block;background:linear-gradient(135deg,#7c5cff,#6c4cef);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">
                Vérifier mon email
              </a>
            </td>
          </tr>
          <tr>
            <td style="color:#a0a3b1;font-size:13px;line-height:1.6;">
              <p style="margin:0 0 8px;">Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :</p>
              <p style="margin:0 0 16px;word-break:break-all;color:#7c5cff;">${lienVerification}</p>
              <p style="margin:0;color:#6b6e7b;">Ce lien expire dans 24 heures. Si tu n'as pas créé de compte, ignore cet email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const transport = creerTransport();

  const info = await transport.sendMail({
    from: `"La Première Pierre" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Vérifie ton adresse email — La Première Pierre',
    html,
  });

  console.log(`[EMAIL] Vérification envoyée à ${email} — messageId: ${info.messageId}`);
};
