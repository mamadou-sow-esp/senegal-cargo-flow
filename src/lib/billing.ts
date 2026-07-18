// ============================================================
// ORUS TRANSIT — Encaissement manuel via Wave
// Un lien de paiement Wave par formule (montant pré-rempli).
// ⚠️  COLLE TES 3 LIENS Wave ci-dessous.
// ============================================================

import type { PlanId } from "@/lib/plans";

/**
 * Lien de paiement Wave pour chaque formule payante.
 * Récupère-les depuis ton espace Wave marchand (un lien par montant).
 * Laisse "" pour une formule non encore configurée.
 */
export const WAVE_PLAN_LINKS: Partial<Record<PlanId, string>> = {
  pro: "https://pay.wave.com/m/M_sn_9G6l39cBgOlh/c/sn/?amount=30000",
};

export const MANUAL_PAYMENT = {
  /** Bénéficiaire affiché au client. */
  beneficiary: "ORUS TRANSIT",
  /**
   * QR code Wave (optionnel, en complément des liens).
   * Dépose l'image dans public/wave-qr.png, ou laisse "" pour ne rien afficher.
   */
  waveQrImage: "",
  /** Adresse de contact / aide. */
  contactEmail: "contact@orustransit.com",
  /** Message affiché sous le bouton de paiement. */
  note:
    "Après votre paiement, il est vérifié puis validé. L'activation intervient " +
    "généralement sous 30 minutes. Vous recevrez un email avec le lien d'accès " +
    "dès l'activation. Vous pouvez continuer à utiliser votre essai en attendant.",
};
