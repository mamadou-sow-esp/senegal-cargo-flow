// ============================================================
// ORUS TRANSIT — Formules d'abonnement (source de vérité unique)
// Partagé client + serveur. Toute limite/prix se change ICI.
// ============================================================

export type PlanId = "trial" | "solo" | "cabinet" | "entreprise";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Prix mensuel en FCFA. null = sur devis. 0 = gratuit. */
  price: number | null;
  /** Nombre total d'utilisateurs (admin + employés). null = illimité. */
  maxUsers: number | null;
  /** Dossiers actifs simultanés. null = illimité. */
  maxActiveDossiers: number | null;
  /** Quota de SMS inclus par mois. 0 = SMS non inclus. */
  smsQuota: number;
  /** Accès au portail client par invitation. */
  clientPortal: boolean;
  /** Assistant IA. */
  ai: boolean;
  /** Mise en avant sur la page tarifs. */
  highlight?: boolean;
  /** Argumentaire affiché sur les cartes. */
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  trial: {
    id: "trial",
    name: "Essai",
    tagline: "14 jours pour tout tester, sans engagement.",
    price: 0,
    maxUsers: 2,
    maxActiveDossiers: 10,
    smsQuota: 0,
    clientPortal: false,
    ai: true,
    features: [
      "2 utilisateurs",
      "Jusqu'à 10 dossiers actifs",
      "Pipeline de dédouanement complet",
      "Gestion documentaire",
      "Assistant IA (limité)",
    ],
  },
  solo: {
    id: "solo",
    name: "Solo",
    tagline: "Pour le transitaire indépendant.",
    price: 15000,
    maxUsers: 1,
    maxActiveDossiers: null,
    smsQuota: 0,
    clientPortal: false,
    ai: true,
    features: [
      "1 utilisateur",
      "Dossiers illimités",
      "Gestion documentaire & débours",
      "Calculateur droits & taxes",
      "Assistant IA",
    ],
  },
  cabinet: {
    id: "cabinet",
    name: "Cabinet",
    tagline: "Pour une équipe qui gère beaucoup de dossiers.",
    price: 45000,
    maxUsers: 8,
    maxActiveDossiers: null,
    smsQuota: 100,
    clientPortal: true,
    ai: true,
    highlight: true,
    features: [
      "Jusqu'à 8 utilisateurs",
      "Dossiers illimités",
      "100 SMS de notification / mois",
      "Portail client par invitation",
      "Assistant IA",
      "Statistiques avancées",
    ],
  },
  entreprise: {
    id: "entreprise",
    name: "Entreprise",
    tagline: "Multi-agences et gros volumes.",
    price: null,
    maxUsers: null,
    maxActiveDossiers: null,
    smsQuota: 500,
    clientPortal: true,
    ai: true,
    features: [
      "Utilisateurs illimités",
      "Dossiers illimités",
      "500 SMS / mois (rechargeable)",
      "Portail client",
      "Assistant IA prioritaire",
      "Accompagnement dédié",
    ],
  },
};

/** Ordre d'affichage (du plus petit au plus grand). */
export const PLAN_ORDER: PlanId[] = ["trial", "solo", "cabinet", "entreprise"];

/** Formules réellement souscriptibles (l'essai n'est pas « acheté »). */
export const PAID_PLAN_ORDER: PlanId[] = ["solo", "cabinet", "entreprise"];

/** Renvoie une formule à partir d'un identifiant, avec repli sur l'essai. */
export function getPlan(id?: string | null): Plan {
  return PLANS[(id as PlanId) ?? "trial"] ?? PLANS.trial;
}

/** true si `id` est un identifiant de formule connu. */
export function isPlanId(id: string): id is PlanId {
  return id in PLANS;
}

/** "45 000 FCFA" — formatage FCFA sans décimales. */
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
