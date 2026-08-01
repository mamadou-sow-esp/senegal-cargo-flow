import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Calculator } from "lucide-react";
import markWhite from "@/assets/newlogoblack.png";

export const Route = createFileRoute("/_authenticated/calculateur")({
  component: CalculateurPage,
});

const sora = { fontFamily: "var(--font-label)" } as const;

// Catégories du Tarif Extérieur Commun (TEC) CEDEAO.
const DD_CATEGORIES = [
  { rate: 0, label: "Cat 0 · 0 % · biens sociaux essentiels" },
  { rate: 5, label: "Cat 1 · 5 % · matières premières, biens d'équipement" },
  { rate: 10, label: "Cat 2 · 10 % · intrants, produits intermédiaires" },
  { rate: 20, label: "Cat 3 · 20 % · biens de consommation finale" },
  { rate: 35, label: "Cat 4 · 35 % · produits spécifiques" },
];

// Taux sur la valeur CAF/CIF (barème douane sénégalaise, à revérifier).
const RATE = { rs: 0.01, pcs: 0.01, pcc: 0.005, cosec: 0.004, tva: 0.18 };
const ORIGINS = [
  { v: "tiers", label: "Pays tiers" },
  { v: "cedeao", label: "CEDEAO" },
  { v: "uemoa", label: "UEMOA" },
] as const;

function CalculateurPage() {
  const [cifStr, setCif] = useState("");
  const [ddRate, setDdRate] = useState(10);
  const [origin, setOrigin] = useState<"tiers" | "cedeao" | "uemoa">("tiers");
  const [acompteRate, setAcompteRate] = useState(0);

  const cif = Number(cifStr) || 0;
  const dd = cif * (ddRate / 100);
  const rs = cif * RATE.rs;
  const pcs = origin === "uemoa" ? 0 : cif * RATE.pcs;
  const pcc = origin === "uemoa" || origin === "cedeao" ? 0 : cif * RATE.pcc;
  const cosec = cif * RATE.cosec;
  const tvaBase = cif + dd + rs + pcs + pcc + cosec;
  const tva = tvaBase * RATE.tva;
  const acompte = tvaBase * (acompteRate / 100);
  const totalTaxes = dd + rs + pcs + pcc + cosec + tva + acompte;
  const totalTTC = cif + totalTaxes;
  const effRate = cif > 0 ? (totalTaxes / cif) * 100 : 0;

  const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")}`;

  const lines = [
    { label: `Droit de douane · ${ddRate} %`, value: dd },
    { label: "Redevance statistique · 1 %", value: rs },
    { label: "Prélèvement Comm. Solidarité (UEMOA) · 1 %", value: pcs, muted: pcs === 0 },
    { label: "Prélèvement Communautaire (CEDEAO) · 0,5 %", value: pcc, muted: pcc === 0 },
    { label: "COSEC · 0,4 %", value: cosec },
    { label: "TVA · 18 % (CAF + droits)", value: tva },
    ...(acompteRate > 0
      ? [{ label: `Acompte sur impôt · ${acompteRate} %`, value: acompte }]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 md:p-8">
      {/* Bandeau */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d1526] via-[#132038] to-hero-blue p-6 text-white shadow-xl sm:p-8">
        <div
          className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/5 blur-2xl"
          aria-hidden
        />
        <div className="flex items-center gap-3">
          <Calculator className="size-8 shrink-0 text-white" />
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/55">
              Outil douane
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={sora}>
              Estimation des droits &amp; taxes
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
          Devis indicatif d'importation au Sénégal (mise à la consommation),
          calculé sur la valeur CAF selon le Tarif Extérieur Commun de la CEDEAO.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Paramètres */}
        <div className="space-y-6 rounded-3xl border border-border bg-white p-6 shadow-sm lg:col-span-2">
          <div>
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Valeur CAF / CIF
            </span>
            <div className="flex items-end gap-2 border-b-2 border-border pb-2 focus-within:border-hero-blue">
              <input
                type="number"
                value={cifStr}
                onChange={(e) => setCif(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-3xl font-extrabold tabular-nums outline-none placeholder:text-muted-foreground/40"
                style={sora}
              />
              <span className="pb-1 text-sm font-bold text-muted-foreground">
                FCFA
              </span>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Catégorie tarifaire (droit de douane)
            </span>
            <select
              value={ddRate}
              onChange={(e) => setDdRate(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-hero-blue sm:text-sm"
            >
              {DD_CATEGORIES.map((c) => (
                <option key={c.rate} value={c.rate}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Origine des marchandises
            </span>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/60 p-1">
              {ORIGINS.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setOrigin(o.v)}
                  className={`rounded-lg py-2 text-xs font-bold uppercase tracking-wide transition ${
                    origin === o.v
                      ? "bg-hero-blue text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <span className="mt-1.5 block text-[10px] text-muted-foreground">
              Une origine dans la zone réduit les prélèvements communautaires.
            </span>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Acompte sur l'impôt (précompte)
            </span>
            <select
              value={acompteRate}
              onChange={(e) => setAcompteRate(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-hero-blue sm:text-sm"
            >
              <option value={0}>Aucun</option>
              <option value={3}>3 % (importateur avec NINEA)</option>
              <option value={5}>5 % (sans immatriculation)</option>
            </select>
          </label>
        </div>

        {/* Note de liquidation */}
        <div className="lg:col-span-3">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-white shadow-lg">
            <div className="flex items-center justify-between bg-[#0d1526] px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <img src={markWhite} alt="" className="h-6 w-auto object-contain" />
                <span className="text-sm font-extrabold tracking-tight" style={sora}>
                  ORUS TRANSIT
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                Note de liquidation
              </span>
            </div>

            <span
              className="pointer-events-none absolute right-6 top-24 rotate-[-11deg] select-none rounded-md border-2 border-red-400/35 px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-red-400/35"
              aria-hidden
            >
              Indicatif
            </span>

            <div className="p-6">
              <div className="flex items-baseline justify-between border-b border-dashed border-border pb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Valeur en douane (CAF)
                </span>
                <span className="font-mono text-base font-bold tabular-nums" style={sora}>
                  {fmt(cif)} <span className="text-xs text-muted-foreground">F</span>
                </span>
              </div>

              <ul className="mt-1 divide-y divide-dashed divide-border text-sm">
                {lines.map((l) => (
                  <li
                    key={l.label}
                    className={`flex items-center justify-between gap-3 py-2.5 ${
                      l.muted ? "opacity-35" : ""
                    }`}
                  >
                    <span className="text-foreground/80">{l.label}</span>
                    <span className="font-mono tabular-nums">
                      {fmt(l.value)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Total */}
              <div className="mt-4 overflow-hidden rounded-2xl bg-hero-blue text-white">
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                      Total droits &amp; taxes
                    </div>
                    <div className="text-[11px] text-white/60">
                      soit {effRate.toFixed(1)} % de la valeur CAF
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold tabular-nums" style={sora}>
                    {fmt(totalTaxes)}
                    <span className="ml-1 text-sm font-semibold text-white/70">
                      FCFA
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-white/15 px-5 py-2.5 text-xs text-white/80">
                  <span>Coût de revient estimé (CAF + taxes)</span>
                  <span className="font-mono tabular-nums">{fmt(totalTTC)} FCFA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs leading-relaxed text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
        <strong>Estimation indicative.</strong> Ce calcul ne remplace pas la
        liquidation officielle des Douanes. Il n'intègre pas les exonérations, la
        taxe conjoncturelle (TCI 10 % sur sucre, farine, huile…), la taxe de luxe,
        les accises, ni les particularités de certains codes SH. Vérifiez toujours
        auprès du système GAINDE et d'un déclarant agréé.
      </div>
    </div>
  );
}
