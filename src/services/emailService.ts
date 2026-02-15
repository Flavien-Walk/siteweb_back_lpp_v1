import { Resend } from 'resend';
import { randomInt } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'La Premiere Pierre <onboarding@resend.dev>';

/**
 * Generer un code de verification 6 chiffres
 */
export const genererCodeVerification = (): string => {
  return String(randomInt(0, 999999)).padStart(6, '0');
};

/**
 * Envoyer un email de verification avec code 6 chiffres
 */
export const envoyerEmailVerification = async (
  email: string,
  prenom: string,
  code: string
): Promise<void> => {
  const digits = code.split('').join(' &nbsp; ');

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `${code} - Verifie ton email`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0D0D12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D12;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#1A1A24;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6C5CE7,#A855F7);padding:32px 24px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">La Premiere Pierre</h1>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:32px 24px;">
          <p style="color:#E0E0E0;font-size:16px;margin:0 0 8px;">Salut ${prenom} !</p>
          <p style="color:#A0A0B0;font-size:14px;margin:0 0 24px;">Voici ton code de verification :</p>
          <!-- Code -->
          <div style="background:#0D0D12;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#fff;font-family:'Courier New',monospace;">${code}</span>
          </div>
          <p style="color:#A0A0B0;font-size:13px;margin:0 0 4px;">Ce code expire dans <strong style="color:#E0E0E0;">10 minutes</strong>.</p>
          <p style="color:#707080;font-size:12px;margin:0;">Si tu n'as pas demande ce code, ignore cet email.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 24px;border-top:1px solid #2A2A36;text-align:center;">
          <p style="color:#505060;font-size:11px;margin:0;">La Premiere Pierre</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
};
