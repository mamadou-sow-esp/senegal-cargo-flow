import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Calculator } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calculateur")({
  component: CalculateurPage,
});

// Catégories du Tarif Extérieur Commun (TEC) CEDEAO.
const DD_CATEGORIES = [
  { rate: 0, label: "Cat 0 · 0 % — biens sociaux essentiels" },
  { rate: 5, label: "Cat 1 · 5 % — matières premières, biens d'équipement" },
  { rate: 10, label: "Cat 2 · 10 % — intrants, produits intermédiaires" },
  { rate: 20, label: "Cat 3 · 20 % — biens de consommation finale" },
  { rate: 35, label: "Cat 4 · 35 % — biens spécifiques" },
];

// Taux appliqués sur la valeur CAF/CIF (à vérifier périodiquement).
const RATE = { rs: 0.01, pcs: 0.01, pcc: 0.005, cosec: 0.004, tva: 0.18 };

function CalculateurPage() {
  const [cifStr, setCif] = useState("");
  const [ddRate, setDdRate] = useState(10);
  const [origin, setOrigin] = useState<"tiers" | "cedeao" | "uemoa">("tiers");

  const cif = Number(cifStr) || 0;
  const dd = cif * (ddRate / 100);
  const rs = cif * RATE.rs;
  const pcs = origin === "uemoa" ? 0 : cif * RATE.pcs;
  const pcc = origin === "uemoa" || origin === "cedeao" ? 0 : cif * RATE.pcc;
  const cosec = cif * RATE.cosec;
  const tvaBase = cif + dd + rs + pcs + pcc + cosec;
  const tva = tvaBase * RATE.tva;
  const totalTaxes = dd + rs + pcs + pcc + cosec + tva;
  const totalTTC = cif + totalTaxes;

  const fmt = (n: number) =>
    `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

  const lines = [
    { label: "Valeur en douane (CAF/CIF)", value: cif, base: true },
    { label: `Droit de douane (${ddRate} %)`, value: dd },
    { label: "Redevance statistique (1 %)", value: rs },
    {
      label: "Prélèvement Comm. Solidarité — PCS (1 %)",
      value: pcs,
      muted: pcs === 0,
    },
    {
      label: "Prélèvement CEDEAO — PC (0,5 %)",
      value: pcc,
      muted: pcc === 0,
    },
    { label: "COSEC (0,4 %)", value: cosec },
    { label: "TVA (18 % sur CAF + droits)", value: tva },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-8">
      <div>
        <div className="font-label text-[10px] font-bold uppercase tracking-widest text-hero-blue">
          Outils
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Calculator className="size-6 text-hero-blue" />
          Estimation des droits &amp; taxes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Devis indicatif d'import au Sénégal, à partir de la valeur CAF.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Entrées */}
        <div className="space-y-4 rounded-xl border border-border bg-white p-5">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Valeur CAF / CIF (FCFA)
            </span>
            <input
              type="number"
              value={cifStr}
              onChange={(e) => setCif(e.target.value)}
              placeholder="Ex : 27 300 000"
              className="w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-hero-blue focus:ring-2 focus:ring-hero-blue/25"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Catégorie tarifaire (DD)
            </span>
            <select
              value={ddRate}
              onChange={(e) => setDdRate(Number(e.target.value))}
              className="w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm"
            >
              {DD_CATEGORIES.map((c) => (
                <option key={c.rate} value={c.rate}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Origine des marchandises
            </span>
            <select
              value={origin}
              onChange={(e) =>
                setOrigin(e.target.value as "tiers" | "cedeao" | "uemoa")
              }
              className="w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm"
            >
              <option value="tiers">Pays tiers (hors CEDEAO)</option>
              <option value="cedeao">CEDEAO (hors UEMOA)</option>
              <option value="uemoa">UEMOA</option>
            </select>
            <span className="mt-1 block text-[10px] text-muted-foreground">
              L'origine dans la zone réduit certains prélèvements communautaires.
            </span>
          </label>
        </div>

        {/* Résultat */}
        <div className="flex flex-col rounded-xl border border-border bg-white p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Détail de la liquidation
          </div>
          <ul className="mt-3 flex-1 divide-y divide-border text-sm">
            {lines.map((l) => (
              <li
                key={l.label}
                className={`flex items-center justify-between gap-3 py-2 ${
                  l.muted ? "opacity-40" : ""
                }`}
              >
                <span className={l.base ? "font-semibold" : ""}>{l.label}</span>
                <span className="font-mono tabular-nums">{fmt(l.value)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 space-y-2 border-t-2 border-foreground/80 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wide">
                Total droits &amp; taxes
              </span>
              <span className="font-mono text-lg font-extrabold text-hero-blue">
                {fmt(totalTaxes)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Coût de revient estimé (CAF + taxes)</span>
              <span className="font-mono">{fmt(totalTTC)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-800">
        <strong>Estimation indicative.</strong> Ce calcul ne remplace pas la
        liquidation officielle des Douanes. Il n'intègre pas les exonérations, les
        taxes spécifiques (produits soumis à accises, taxe de luxe, prélèvements
        sectoriels), l'acompte sur impôts, ni les particularités de certains codes
        SH. Vérifiez toujours auprès du système GAINDE et d'un déclarant agréé.
      </div>
    </div>
  );
}
