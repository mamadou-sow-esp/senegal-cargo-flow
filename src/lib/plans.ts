// ============================================================
// ORUS TRANSIT — Formules d'abonnement (source de vérité unique)
// Modèle : Essai gratuit 7 jours → formule Pro unique.
// ============================================================

export type PlanId = "trial" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Prix mensuel en FCFA. 0 = gratuit (essai). null = sur devis (non utilisé). */
  price: number | null;
  /** Durée de l'essai en jours (formule trial uniquement). */
  trialDays?: number;
  /** Nombre total d'utilisateurs. null = illimité. */
  maxUsers: number | null;
  /** Dossiers actifs (non clôturés) simultanés. null = illimité. */
  maxActiveDossiers: number | null;
  /** Quota de SMS inclus par mois. */
  smsQuota: number;
  /** Requêtes à l'assistant IA par jour. null = illimité. */
  aiPerDay: number | null;
  /** Accès au portail client par invitation. */
  clientPortal: boolean;
  /** Assistant IA. */
  ai: boolean;
  /** Mise en avant. */
  highlight?: boolean;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  trial: {
    id: "trial",
    name: "Essai",
    tagline: "7 jours pour découvrir toute la plateforme.",
    price: 0,
    trialDays: 7,
    maxUsers: null,
    maxActiveDossiers: 2,
    smsQuota: 1,
    aiPerDay: 3,
    clientPortal: false,
    ai: true,
    features: [
      "7 jours d'essai gratuit",
      "2 dossiers traitables",
      "1 SMS de notification",
      "3 questions à l'assistant IA / jour",
      "Toutes les fonctions de base",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Toute la plateforme, sans aucune limite.",
    price: 29900,
    maxUsers: null,
    maxActiveDossiers: null,
    smsQuota: 1000,
    aiPerDay: null,
    clientPortal: true,
    ai: true,
    highlight: true,
    features: [
      "Dossiers illimités",
      "Utilisateurs illimités",
      "Notifications SMS",
      "Assistant IA illimité",
      "Portail client par invitation",
      "Statistiques avancées",
      "Support prioritaire",
    ],
  },
};

/** Ordre d'affichage. */
export const PLAN_ORDER: PlanId[] = ["trial", "pro"];

/** Formules réellement souscriptibles (l'essai n'est pas « acheté »). */
export const PAID_PLAN_ORDER: PlanId[] = ["pro"];

/** Renvoie une formule à partir d'un identifiant, avec repli sur l'essai. */
export function getPlan(id?: string | null): Plan {
  return PLANS[(id as PlanId) ?? "trial"] ?? PLANS.trial;
}

/** true si `id` est un identifiant de formule connu. */
export function isPlanId(id: string): id is PlanId {
  return id in PLANS;
}

/** "30 000 FCFA" — formatage FCFA sans décimales. */
export function formatFcfa(n: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(n)} FCFA`;
}

/** Libellé prix pour l'affichage sur une carte. */
export function priceLabel(plan: Plan): string {
  if (plan.price === null) return "Sur devis";
  if (plan.price === 0) return "Gratuit";
  return formatFcfa(plan.price);
}

/** null = illimité → "Illimité". */
export function limitLabel(n: number | null): string {
  return n === null ? "Illimité" : String(n);
}
