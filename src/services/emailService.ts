import { Resend } from 'resend';
import { randomInt } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'La Premiere Pierre <noreply@lapremierepierre.org>';

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
  console.log(`[EMAIL] Envoi vers ${email} (from: ${FROM_EMAIL}, API key: ${process.env.RESEND_API_KEY ? 'presente' : 'MANQUANTE'})`);

  const result = await resend.emails.send({
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

  console.log(`[EMAIL] Resultat:`, JSON.stringify(result));
};

// ============================================
// EMAILS LPP+ (ABONNEMENT)
// ============================================

const lppEmailTemplate = (prenom: string, title: string, body: string): string => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0D0D12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D12;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#1A1A24;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#6C5CE7,#A855F7);padding:32px 24px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">La Premiere Pierre+</h1>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          <p style="color:#E0E0E0;font-size:16px;margin:0 0 8px;">Salut ${prenom} !</p>
          <h2 style="color:#A855F7;font-size:18px;margin:0 0 16px;">${title}</h2>
          ${body}
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #2A2A36;text-align:center;">
          <p style="color:#505060;font-size:11px;margin:0;">La Premiere Pierre</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

/**
 * Email d'activation LPP+
 */
export const envoyerEmailLppActivation = async (
  email: string,
  prenom: string,
  dateFinPeriode: string
): Promise<void> => {
  const body = `
    <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">Ton abonnement LPP+ est maintenant actif ! Tu beneficies desormais de tous les avantages premium.</p>
    <div style="background:#0D0D12;border-radius:12px;padding:16px;margin:0 0 16px;">
      <p style="color:#A855F7;font-size:14px;margin:0 0 4px;font-weight:600;">Tes avantages :</p>
      <p style="color:#E0E0E0;font-size:13px;margin:0 0 4px;">&#10003; Badge certifie sur ton profil</p>
      <p style="color:#E0E0E0;font-size:13px;margin:0 0 4px;">&#10003; Support prioritaire</p>
      <p style="color:#E0E0E0;font-size:13px;margin:0;">&#10003; Reductions sur les boosts</p>
    </div>
    <p style="color:#707080;font-size:12px;margin:0;">Prochaine echeance : ${dateFinPeriode}</p>`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Bienvenue dans LPP+ !',
    html: lppEmailTemplate(prenom, 'Abonnement active', body),
  });
};

/**
 * Email de resiliation LPP+ (fin de periode)
 */
export const envoyerEmailLppResiliation = async (
  email: string,
  prenom: string,
  dateFinPeriode: string
): Promise<void> => {
  const body = `
    <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">Nous avons pris en compte ta demande de resiliation. Ton abonnement reste actif jusqu'a la fin de ta periode en cours.</p>
    <div style="background:#0D0D12;border-radius:12px;padding:16px;margin:0 0 16px;">
      <p style="color:#E0E0E0;font-size:14px;margin:0;"><strong>Actif jusqu'au :</strong> ${dateFinPeriode}</p>
    </div>
    <p style="color:#707080;font-size:12px;margin:0;">Tu peux reactiver a tout moment avant cette date.</p>`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'LPP+ - Resiliation prise en compte',
    html: lppEmailTemplate(prenom, 'Resiliation confirmee', body),
  });
};

/**
 * Email de reactivation LPP+
 */
export const envoyerEmailLppReactivation = async (
  email: string,
  prenom: string
): Promise<void> => {
  const body = `
    <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">Super nouvelle ! Ta resiliation a ete annulee et ton abonnement LPP+ continue normalement.</p>
    <p style="color:#707080;font-size:12px;margin:0;">Tes avantages premium restent actifs sans interruption.</p>`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'LPP+ - Abonnement reactive !',
    html: lppEmailTemplate(prenom, 'Reactivation confirmee', body),
  });
};

/**
 * Email de fin d'abonnement LPP+
 */
export const envoyerEmailLppFin = async (
  email: string,
  prenom: string
): Promise<void> => {
  const body = `
    <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">Ton abonnement LPP+ a pris fin. Tu peux te reabonner a tout moment pour retrouver tes avantages premium.</p>
    <p style="color:#707080;font-size:12px;margin:0;">Merci d'avoir fait partie de LPP+ !</p>`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'LPP+ - Abonnement termine',
    html: lppEmailTemplate(prenom, 'Abonnement termine', body),
  });
};

/**
 * Email de renouvellement LPP+
 */
export const envoyerEmailLppRenouvellement = async (
  email: string,
  prenom: string,
  dateFinPeriode: string
): Promise<void> => {
  const body = `
    <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">Ton abonnement LPP+ a ete renouvele avec succes. Profite de tes avantages premium pour un mois de plus !</p>
    <div style="background:#0D0D12;border-radius:12px;padding:16px;margin:0 0 16px;">
      <p style="color:#E0E0E0;font-size:14px;margin:0;"><strong>Prochaine echeance :</strong> ${dateFinPeriode}</p>
    </div>
    <p style="color:#707080;font-size:12px;margin:0;">Merci de ta confiance !</p>`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'LPP+ - Abonnement renouvele',
    html: lppEmailTemplate(prenom, 'Renouvellement confirme', body),
  });
};
