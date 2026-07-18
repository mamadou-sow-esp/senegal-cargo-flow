// ============================================================
// ORUS TRANSIT — Envoi d'emails transactionnels via Resend
// Nécessite dans .env : RESEND_API_KEY et (recommandé) RESEND_FROM
//   RESEND_FROM="ORUS TRANSIT <no-reply@ton-domaine.com>"
// Sans clé, l'envoi est ignoré proprement (log + retour {sent:false}).
// ============================================================

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "ORUS TRANSIT <onboarding@resend.dev>";
  if (!key) {
    console.warn("[email] RESEND_API_KEY manquant — email non envoyé.");
    return { sent: false, reason: "no_key" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      console.error("[email] échec Resend:", await res.text());
      return { sent: false, reason: "http" };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email] erreur réseau:", e);
    return { sent: false, reason: "network" };
  }
}

/** Email HTML d'activation d'abonnement (accents en entités). */
export function activationEmailHtml(params: {
  planName: string;
  appUrl: string;
}): string {
  const { planName, appUrl } = params;
  return `<meta charset="utf-8">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f6fb;margin:0;padding:32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" role="presentation" style="width:480px;max-width:92%;background-color:#ffffff;border:1px solid #e6e9f0;border-radius:8px;overflow:hidden;">
      <tr><td style="background-color:#141a2b;padding:24px 32px;">
        <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">O<span style="color:#33a8ff;">RUS</span> TRANSIT</span>
      </td></tr>
      <tr><td style="padding:36px 32px 8px 32px;">
        <h1 style="margin:0;font-size:22px;font-weight:800;color:#141a2b;letter-spacing:-0.4px;">Votre formule ${planName} est activ&eacute;e</h1>
        <div style="height:4px;width:48px;background-color:#2f6bed;margin:14px 0 0 0;border-radius:2px;"></div>
        <p style="margin:22px 0 0 0;font-size:15px;line-height:1.6;color:#4a5162;">
          Bonne nouvelle&nbsp;! Votre paiement a &eacute;t&eacute; v&eacute;rifi&eacute; et votre
          abonnement <strong>${planName}</strong> est maintenant actif. Vous
          pouvez acc&eacute;der &agrave; l'ensemble des fonctionnalit&eacute;s de votre espace.
        </p>
      </td></tr>
      <tr><td style="padding:28px 32px 8px 32px;">
        <table cellpadding="0" cellspacing="0" role="presentation"><tr>
          <td style="background-color:#2f6bed;border-radius:6px;">
            <a href="${appUrl}" style="display:inline-block;padding:14px 30px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#ffffff;text-decoration:none;">Acc&eacute;der &agrave; mon espace</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:20px 32px 32px 32px;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#8b91a1;">
          Si le bouton ne fonctionne pas, copiez ce lien&nbsp;:<br>
          <a href="${appUrl}" style="color:#2f6bed;word-break:break-all;">${appUrl}</a>
        </p>
      </td></tr>
      <tr><td style="background-color:#f4f6fb;padding:20px 32px;border-top:1px solid #e6e9f0;">
        <p style="margin:0;font-size:11px;color:#9aa0af;">&copy; 2026 ORUS TRANSIT &middot; Dakar, S&eacute;n&eacute;gal.<br>Gestion du d&eacute;douanement pour transitaires.</p>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

/** Email HTML d'invitation d'un client importateur au portail (entités). */
export function inviteClientEmailHtml(params: {
  clientName: string;
  cabinetName: string;
  actionLink: string;
}): string {
  const { clientName, cabinetName, actionLink } = params;
  return `<meta charset="utf-8">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f6fb;margin:0;padding:32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" role="presentation" style="width:480px;max-width:92%;background-color:#ffffff;border:1px solid #e6e9f0;border-radius:8px;overflow:hidden;">
      <tr><td style="background-color:#141a2b;padding:24px 32px;">
        <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">O<span style="color:#33a8ff;">RUS</span> TRANSIT</span>
      </td></tr>
      <tr><td style="padding:36px 32px 8px 32px;">
        <h1 style="margin:0;font-size:22px;font-weight:800;color:#141a2b;letter-spacing:-0.4px;">Suivez vos dossiers en temps r&eacute;el</h1>
        <div style="height:4px;width:48px;background-color:#2f6bed;margin:14px 0 0 0;border-radius:2px;"></div>
        <p style="margin:22px 0 0 0;font-size:15px;line-height:1.6;color:#4a5162;">
          Bonjour ${clientName},<br><br>
          <strong>${cabinetName}</strong> vous invite &agrave; acc&eacute;der &agrave; votre
          <strong>portail client ORUS TRANSIT</strong>. Vous pourrez y suivre
          l'avancement du d&eacute;douanement de vos marchandises, consulter vos
          documents et &eacute;changer en toute transparence.
        </p>
        <p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;color:#4a5162;">
          Cliquez ci-dessous pour ouvrir votre suivi. Aucun compte ni mot de
          passe n'est n&eacute;cessaire &mdash; ce lien vous est personnel.
        </p>
      </td></tr>
      <tr><td style="padding:28px 32px 8px 32px;">
        <table cellpadding="0" cellspacing="0" role="presentation"><tr>
          <td style="background-color:#2f6bed;border-radius:6px;">
            <a href="${actionLink}" style="display:inline-block;padding:14px 30px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#ffffff;text-decoration:none;">Suivre mon dossier</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:20px 32px 32px 32px;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#8b91a1;">
          Si le bouton ne fonctionne pas, copiez ce lien&nbsp;:<br>
          <a href="${actionLink}" style="color:#2f6bed;word-break:break-all;">${actionLink}</a>
        </p>
        <p style="margin:18px 0 0 0;font-size:12px;line-height:1.6;color:#8b91a1;">
          Vous ne connaissez pas ORUS TRANSIT&nbsp;? Ignorez simplement cet e-mail.
        </p>
      </td></tr>
      <tr><td style="background-color:#f4f6fb;padding:20px 32px;border-top:1px solid #e6e9f0;">
        <p style="margin:0;font-size:11px;color:#9aa0af;">&copy; 2026 ORUS TRANSIT &middot; Dakar, S&eacute;n&eacute;gal.<br>Gestion du d&eacute;douanement pour transitaires.</p>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}
