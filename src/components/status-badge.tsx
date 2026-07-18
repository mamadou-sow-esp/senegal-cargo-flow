import { Check } from "lucide-react";

// Badge de statut d'abonnement : pilule sombre + indicateur coloré à droite.
// Style unique, utilisé côté cabinet (Abonnement) et côté console admin.
const MAP: Record<
  string,
  { label: string; tone: string; check?: boolean }
> = {
  active: { label: "Actif", tone: "bg-emerald-500", check: true },
  trialing: { label: "Essai", tone: "bg-amber-400" },
  pending: { label: "En attente", tone: "bg-orange-400" },
  past_due: { label: "Échu", tone: "bg-red-500" },
  canceled: { label: "Résilié", tone: "bg-slate-400" },
};

export function StatusBadge({ status }: { status?: string | null }) {
  const s = MAP[status ?? "trialing"] ?? MAP.trialing;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
      {s.label}
      {s.check ? (
        <span className={`grid size-4 place-items-center rounded-full ${s.tone}`}>
          <Check className="size-2.5 text-white" strokeWidth={3.5} />
        </span>
      ) : (
        <span className={`size-2.5 rounded-full ${s.tone}`} />
      )}
    </span>
  );
}
