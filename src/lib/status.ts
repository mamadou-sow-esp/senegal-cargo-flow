import type { Database } from "@/integrations/supabase/types";

export type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];
export type ShipmentPriority = Database["public"]["Enums"]["shipment_priority"];

export const STATUS_ORDER: ShipmentStatus[] = [
  "cree",
  "documents_attente",
  "documents_complets",
  "declaration_preparee",
  "declaration_deposee",
  "attente_validation",
  "controle_documentaire",
  "controle_physique",
  "paiement_droits",
  "bon_a_enlever",
  "marchandise_sortie",
  "cloture",
];

export const STATUS_LABEL: Record<ShipmentStatus, string> = {
  cree: "Créé",
  documents_attente: "Documents en attente",
  documents_complets: "Documents complets",
  declaration_preparee: "Déclaration préparée",
  declaration_deposee: "Déclaration déposée",
  attente_validation: "Attente de validation",
  controle_documentaire: "Contrôle documentaire",
  controle_physique: "Contrôle physique",
  paiement_droits: "Paiement des droits",
  bon_a_enlever: "Bon à enlever",
  marchandise_sortie: "Marchandise sortie",
  cloture: "Dossier clôturé",
};

export const PRIORITY_LABEL: Record<ShipmentPriority, string> = {
  basse: "Basse",
  standard: "Standard",
  haute: "Haute",
  critique: "Critique",
};

export function statusProgress(s: ShipmentStatus) {
  const idx = STATUS_ORDER.indexOf(s);
  return ((idx + 1) / STATUS_ORDER.length) * 100;
}

export function statusTone(s: ShipmentStatus): "neutral" | "progress" | "done" | "blocked" {
  if (s === "cloture" || s === "marchandise_sortie") return "done";
  if (s === "documents_attente") return "blocked";
  if (s === "cree") return "neutral";
  return "progress";
}

export function priorityTone(p: ShipmentPriority) {
  switch (p) {
    case "critique":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
    case "haute":
      return "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300";
    case "basse":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}
