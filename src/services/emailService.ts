import { Resend } from 'resend';
import { randomInt } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'La Premiere Pierre <noreply@lapremierepierre.org>';
const REPLY_TO = 'support@lapremierepierre.org';

// URL de desabonnement (page parametres de l'app ou landing page)
const UNSUBSCRIBE_URL = 'https://lapremierepierre.org/parametres';

/**
 * Headers communs pour les emails transactionnels LPP+.
 *
 * - Reply-To : permet au destinataire de repondre vers le support
 * - List-Unsubscribe : requis par Gmail depuis fevrier 2024 pour les
 *   emails lies a un abonnement. Empeche le classement en spam.
 * - List-Unsubscribe-Post : methode one-click unsubscribe (RFC 8058),
 *   exigee par Gmail/Yahoo pour les expediteurs de masse.
 */
const LPP_EMAIL_HEADERS = {
  'List-Unsubscribe': `<mailto:unsubscribe@lapremierepierre.org?subject=unsubscribe>, <${UNSUBSCRIBE_URL}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
};

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
  console.log(`[EMAIL] Envoi verification vers ${email}`);

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: REPLY_TO,
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
          <p style="color:#505060;font-size:11px;margin:0;">La Premiere Pierre — cet email a ete envoye automatiquement.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Salut ${prenom} !\n\nVoici ton code de verification : ${code}\n\nCe code expire dans 10 minutes.\nSi tu n'as pas demande ce code, ignore cet email.\n\n— La Premiere Pierre`,
  });

  console.log(`[EMAIL] Verification envoyee:`, JSON.stringify(result));
};

// ============================================
// EMAILS LPP+ (ABONNEMENT)
// ============================================

/**
 * Template HTML commun pour tous les emails LPP+.
 * Le footer inclut une mention legale et un lien de desabonnement
 * pour satisfaire les exigences anti-spam de Gmail/Yahoo.
 */
const lppEmailTemplate = (prenom: string, title: string, body: string): string => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0D0D12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D12;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#1A1A24;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#6C5CE7,#A855F7);padding:32px 24px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">La Premiere Pierre</h1>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          <p style="color:#E0E0E0;font-size:16px;margin:0 0 8px;">Salut ${prenom},</p>
          <h2 style="color:#A855F7;font-size:18px;margin:0 0 16px;">${title}</h2>
          ${body}
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #2A2A36;text-align:center;">
          <p style="color:#505060;font-size:11px;margin:0 0 4px;">La Premiere Pierre — cet email a ete envoye automatiquement.</p>
          <p style="color:#505060;font-size:11px;margin:0;">Tu recois cet email car tu possedes un compte La Premiere Pierre.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

/**
 * Email d'activation LPP+
 * Sujet transactionnel (pas de "!" ni de vocabulaire marketing)
 */
export const envoyerEmailLppActivation = async (
  email: string,
  prenom: string,
  dateFinPeriode: string
): Promise<void> => {
  console.log(`[EMAIL LPP+] Envoi activation vers ${email}`);

  const body = `
    <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">Ton abonnement LPP+ est maintenant actif. Voici un recapitulatif de ton compte.</p>
    <div style="background:#0D0D12;border-radius:12px;padding:16px;margin:0 0 16px;">
      <p style="color:#A855F7;font-size:14px;margin:0 0 4px;font-weight:600;">Inclus dans ton abonnement :</p>
      <p style="color:#E0E0E0;font-size:13px;margin:0 0 4px;">&#10003; Badge certifie sur ton profil</p>
      <p style="color:#E0E0E0;font-size:13px;margin:0 0 4px;">&#10003; Support prioritaire</p>
      <p style="color:#E0E0E0;font-size:13px;margin:0;">&#10003; Reductions sur les mises en avant</p>
    </div>
    <p style="color:#A0A0B0;font-size:13px;margin:0 0 4px;">Date de debut : aujourd'hui</p>
    <p style="color:#A0A0B0;font-size:13px;margin:0 0 4px;">Prochaine echeance : ${dateFinPeriode}</p>
    <p style="color:#707080;font-size:12px;margin:16px 0 0;">Tu peux resilier a tout moment depuis les parametres de ton compte.</p>`;

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: REPLY_TO,
    subject: `Confirmation de ton abonnement LPP+`,
    headers: LPP_EMAIL_HEADERS,
    html: lppEmailTemplate(prenom, 'Abonnement active', body),
    text: `Salut ${prenom},\n\nTon abonnement LPP+ est maintenant actif.\n\nInclus dans ton abonnement :\n- Badge certifie sur ton profil\n- Support prioritaire\n- Reductions sur les mises en avant\n\nDate de debut : aujourd'hui\nProchaine echeance : ${dateFinPeriode}\n\nTu peux resilier a tout moment depuis les parametres de ton compte.\n\n— La Premiere Pierre`,
  });

  console.log(`[EMAIL LPP+] Activation envoyee:`, JSON.stringify(result));
};

/**
 * Email de resiliation LPP+ (fin de periode)
 */
export const envoyerEmailLppResiliation = async (
  email: string,
  prenom: string,
  dateFinPeriode: string
): Promise<void> => {
  console.log(`[EMAIL LPP+] Envoi resiliation vers ${email}`);

  const body = `
    <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">Ta demande de resiliation a bien ete prise en compte. Ton abonnement reste actif jusqu'a la fin de ta periode en cours.</p>
    <div style="background:#0D0D12;border-radius:12px;padding:16px;margin:0 0 16px;">
      <p style="color:#E0E0E0;font-size:14px;margin:0;"><strong>Actif jusqu'au :</strong> ${dateFinPeriode}</p>
    </div>
    <p style="color:#707080;font-size:12px;margin:0;">Tu peux reactiver ton abonnement a tout moment avant cette date depuis les parametres de ton compte.</p>`;

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: REPLY_TO,
    subject: `LPP+ - Confirmation de resiliation`,
    headers: LPP_EMAIL_HEADERS,
    html: lppEmailTemplate(prenom, 'Resiliation confirmee', body),
    text: `Salut ${prenom},\n\nTa demande de resiliation a bien ete prise en compte.\n\nTon abonnement reste actif jusqu'au : ${dateFinPeriode}\n\nTu peux reactiver a tout moment avant cette date depuis les parametres de ton compte.\n\n— La Premiere Pierre`,
  });

  console.log(`[EMAIL LPP+] Resiliation envoyee:`, JSON.stringify(result));
};

/**
 * Email de reactivation LPP+
 */
export const envoyerEmailLppReactivation = async (
  email: string,
  prenom: string
): Promise<void> => {
  console.log(`[EMAIL LPP+] Envoi reactivation vers ${email}`);

  const body = `
    <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">Ta resiliation a ete annulee. Ton abonnement LPP+ continue normalement sans interruption.</p>
    <p style="color:#707080;font-size:12px;margin:0;">Aucune action supplementaire n'est requise de ta part.</p>`;

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: REPLY_TO,
    subject: `LPP+ - Abonnement reactive`,
    headers: LPP_EMAIL_HEADERS,
    html: lppEmailTemplate(prenom, 'Reactivation confirmee', body),
    text: `Salut ${prenom},\n\nTa resiliation a ete annulee. Ton abonnement LPP+ continue normalement sans interruption.\n\nAucune action supplementaire n'est requise de ta part.\n\n— La Premiere Pierre`,
  });

  console.log(`[EMAIL LPP+] Reactivation envoyee:`, JSON.stringify(result));
};

/**
 * Email de fin d'abonnement LPP+
 */
export const envoyerEmailLppFin = async (
  email: string,
  prenom: string
): Promise<void> => {
  console.log(`[EMAIL LPP+] Envoi fin abonnement vers ${email}`);

  const body = `
    <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">Ton abonnement LPP+ a pris fin. Tu peux te reabonner a tout moment depuis la boutique de l'application.</p>
    <p style="color:#707080;font-size:12px;margin:0;">Merci d'avoir utilise LPP+.</p>`;

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: REPLY_TO,
    subject: `LPP+ - Fin de ton abonnement`,
    headers: LPP_EMAIL_HEADERS,
    html: lppEmailTemplate(prenom, 'Abonnement termine', body),
    text: `Salut ${prenom},\n\nTon abonnement LPP+ a pris fin.\n\nTu peux te reabonner a tout moment depuis la boutique de l'application.\n\nMerci d'avoir utilise LPP+.\n\n— La Premiere Pierre`,
  });

  console.log(`[EMAIL LPP+] Fin abonnement envoyee:`, JSON.stringify(result));
};

/**
 * Email de renouvellement LPP+
 */
export const envoyerEmailLppRenouvellement = async (
  email: string,
  prenom: string,
  dateFinPeriode: string
): Promise<void> => {
  console.log(`[EMAIL LPP+] Envoi renouvellement vers ${email}`);

  const body = `
    <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">Ton abonnement LPP+ a ete renouvele. Voici les details de ta prochaine echeance.</p>
    <div style="background:#0D0D12;border-radius:12px;padding:16px;margin:0 0 16px;">
      <p style="color:#E0E0E0;font-size:14px;margin:0;"><strong>Prochaine echeance :</strong> ${dateFinPeriode}</p>
    </div>
    <p style="color:#707080;font-size:12px;margin:0;">Tu peux gerer ton abonnement depuis les parametres de ton compte.</p>`;

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: REPLY_TO,
    subject: `LPP+ - Renouvellement de ton abonnement`,
    headers: LPP_EMAIL_HEADERS,
    html: lppEmailTemplate(prenom, 'Renouvellement confirme', body),
    text: `Salut ${prenom},\n\nTon abonnement LPP+ a ete renouvele.\n\nProchaine echeance : ${dateFinPeriode}\n\nTu peux gerer ton abonnement depuis les parametres de ton compte.\n\n— La Premiere Pierre`,
  });

  console.log(`[EMAIL LPP+] Renouvellement envoye:`, JSON.stringify(result));
};

// ============================================
// EMAILS MARKETPLACE (COMMANDES)
// ============================================

/**
 * Email nouvelle commande recue (→ vendeur)
 */
export const envoyerEmailNouvelleCommande = async (
  email: string,
  prenom: string,
  serviceNom: string,
  acheteurPrenom: string,
  montant: string,
): Promise<void> => {
  console.log(`[EMAIL MARKETPLACE] Envoi nouvelle commande vers ${email}`);
  try {
    const body = `
      <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">Tu as recu une nouvelle commande sur la marketplace.</p>
      <div style="background:#0D0D12;border-radius:12px;padding:16px;margin:0 0 16px;">
        <p style="color:#E0E0E0;font-size:14px;margin:0 0 4px;"><strong>Service :</strong> ${serviceNom}</p>
        <p style="color:#E0E0E0;font-size:14px;margin:0 0 4px;"><strong>Acheteur :</strong> ${acheteurPrenom}</p>
        <p style="color:#A855F7;font-size:16px;font-weight:700;margin:0;"><strong>Montant :</strong> ${montant}</p>
      </div>
      <p style="color:#A0A0B0;font-size:13px;margin:0;">Connecte-toi a l'application pour accepter ou refuser cette commande.</p>`;
    await resend.emails.send({
      from: FROM_EMAIL, to: email, replyTo: REPLY_TO,
      subject: `Nouvelle commande - ${serviceNom}`,
      html: lppEmailTemplate(prenom, 'Nouvelle commande recue', body),
      text: `Salut ${prenom},\n\nTu as recu une nouvelle commande.\n\nService : ${serviceNom}\nAcheteur : ${acheteurPrenom}\nMontant : ${montant}\n\nConnecte-toi a l'app pour accepter ou refuser.\n\n— La Premiere Pierre`,
    });
  } catch (err) {
    console.error('[EMAIL MARKETPLACE] Erreur envoi nouvelle commande:', err);
  }
};

/**
 * Email commande acceptee (→ acheteur)
 */
export const envoyerEmailCommandeAcceptee = async (
  email: string,
  prenom: string,
  serviceNom: string,
  vendeurPrenom: string,
): Promise<void> => {
  console.log(`[EMAIL MARKETPLACE] Envoi commande acceptee vers ${email}`);
  try {
    const body = `
      <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">Ta commande a ete acceptee. Le vendeur va commencer a travailler dessus.</p>
      <div style="background:#0D0D12;border-radius:12px;padding:16px;margin:0 0 16px;">
        <p style="color:#E0E0E0;font-size:14px;margin:0 0 4px;"><strong>Service :</strong> ${serviceNom}</p>
        <p style="color:#E0E0E0;font-size:14px;margin:0;"><strong>Vendeur :</strong> ${vendeurPrenom}</p>
      </div>
      <p style="color:#A0A0B0;font-size:13px;margin:0;">Tu seras notifie a chaque avancement. Tu peux suivre ta commande dans l'application.</p>`;
    await resend.emails.send({
      from: FROM_EMAIL, to: email, replyTo: REPLY_TO,
      subject: `Commande acceptee - ${serviceNom}`,
      html: lppEmailTemplate(prenom, 'Commande acceptee', body),
      text: `Salut ${prenom},\n\nTa commande "${serviceNom}" a ete acceptee par ${vendeurPrenom}.\n\nTu seras notifie a chaque avancement.\n\n— La Premiere Pierre`,
    });
  } catch (err) {
    console.error('[EMAIL MARKETPLACE] Erreur envoi commande acceptee:', err);
  }
};

/**
 * Email livraison (→ acheteur)
 */
export const envoyerEmailLivraison = async (
  email: string,
  prenom: string,
  serviceNom: string,
  vendeurPrenom: string,
): Promise<void> => {
  console.log(`[EMAIL MARKETPLACE] Envoi livraison vers ${email}`);
  try {
    const body = `
      <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">${vendeurPrenom} a livre ta commande. Verifie les livrables et valide la commande.</p>
      <div style="background:#0D0D12;border-radius:12px;padding:16px;margin:0 0 16px;">
        <p style="color:#E0E0E0;font-size:14px;margin:0;"><strong>Service :</strong> ${serviceNom}</p>
      </div>
      <p style="color:#A0A0B0;font-size:13px;margin:0;">Connecte-toi a l'application pour verifier les livrables et valider ou demander une revision.</p>`;
    await resend.emails.send({
      from: FROM_EMAIL, to: email, replyTo: REPLY_TO,
      subject: `Livraison recue - ${serviceNom}`,
      html: lppEmailTemplate(prenom, 'Livraison recue', body),
      text: `Salut ${prenom},\n\n${vendeurPrenom} a livre ta commande "${serviceNom}".\n\nConnecte-toi a l'app pour verifier et valider.\n\n— La Premiere Pierre`,
    });
  } catch (err) {
    console.error('[EMAIL MARKETPLACE] Erreur envoi livraison:', err);
  }
};

/**
 * Email commande terminee (→ vendeur)
 */
export const envoyerEmailCommandeTerminee = async (
  email: string,
  prenom: string,
  serviceNom: string,
  acheteurPrenom: string,
): Promise<void> => {
  console.log(`[EMAIL MARKETPLACE] Envoi commande terminee vers ${email}`);
  try {
    const body = `
      <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">${acheteurPrenom} a valide ta livraison. La commande est terminee.</p>
      <div style="background:#0D0D12;border-radius:12px;padding:16px;margin:0 0 16px;">
        <p style="color:#10B981;font-size:16px;font-weight:700;margin:0;">&#10003; Commande terminee</p>
        <p style="color:#E0E0E0;font-size:14px;margin:4px 0 0;"><strong>Service :</strong> ${serviceNom}</p>
      </div>
      <p style="color:#A0A0B0;font-size:13px;margin:0;">Merci pour ton travail !</p>`;
    await resend.emails.send({
      from: FROM_EMAIL, to: email, replyTo: REPLY_TO,
      subject: `Commande terminee - ${serviceNom}`,
      html: lppEmailTemplate(prenom, 'Commande terminee', body),
      text: `Salut ${prenom},\n\n${acheteurPrenom} a valide ta livraison pour "${serviceNom}". La commande est terminee.\n\nMerci pour ton travail !\n\n— La Premiere Pierre`,
    });
  } catch (err) {
    console.error('[EMAIL MARKETPLACE] Erreur envoi commande terminee:', err);
  }
};

/**
 * Email deadline prolongee (→ acheteur)
 */
export const envoyerEmailDeadlineExtended = async (
  email: string,
  prenom: string,
  serviceNom: string,
  vendeurPrenom: string,
  dureeAjoutee: string,
): Promise<void> => {
  console.log(`[EMAIL MARKETPLACE] Envoi deadline prolongee vers ${email}`);
  try {
    const body = `
      <p style="color:#A0A0B0;font-size:14px;margin:0 0 16px;">${vendeurPrenom} a prolonge le delai de livraison de ta commande.</p>
      <div style="background:#0D0D12;border-radius:12px;padding:16px;margin:0 0 16px;">
        <p style="color:#E0E0E0;font-size:14px;margin:0;"><strong>Service :</strong> ${serviceNom}</p>
        <p style="color:#3B82F6;font-size:14px;margin:4px 0 0;"><strong>Prolongation :</strong> +${dureeAjoutee}</p>
      </div>
      <p style="color:#A0A0B0;font-size:13px;margin:0;">Connecte-toi a l'application pour suivre l'avancement de ta commande.</p>`;
    await resend.emails.send({
      from: FROM_EMAIL, to: email, replyTo: REPLY_TO,
      subject: `Delai prolonge - ${serviceNom}`,
      html: lppEmailTemplate(prenom, 'Delai prolonge', body),
      text: `Salut ${prenom},\n\n${vendeurPrenom} a prolonge le delai de livraison de "${serviceNom}" de ${dureeAjoutee}.\n\nConnecte-toi a l'app pour suivre ta commande.\n\n— La Premiere Pierre`,
    });
  } catch (err) {
    console.error('[EMAIL MARKETPLACE] Erreur envoi deadline extended:', err);
  }
};
