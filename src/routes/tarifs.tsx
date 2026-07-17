import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import logoAsset from "@/assets/oruslogonobackground.png";
import {
  PLANS,
  PLAN_ORDER,
  priceLabel,
} from "@/lib/plans";

export const Route = createFileRoute("/tarifs")({
  component: TarifsPage,
  head: () => ({
    meta: [{ title: "Tarifs — ORUS TRANSIT" }],
  }),
});

function TarifsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-[1100px] items-center justify-between px-4 sm:px-8">
          <Link to="/" className="flex items-center">
            <img
              src={logoAsset}
              alt="ORUS TRANSIT"
              className="h-14 w-auto object-contain"
            />
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90"
          >
            Essai gratuit <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-4 py-14 sm:px-8 sm:py-20">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
            Tarifs
          </p>
          <h1
            className="mt-3 text-4xl font-extrabold tracking-tighter sm:text-5xl"
            style={{ fontFamily: "var(--font-label)" }}
          >
            Une formule pour chaque cabinet
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
            Commencez gratuitement pendant 14 jours. Paiement par mobile money
            (Wave, Orange Money). Sans engagement.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            return (
              <div
                key={id}
                className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
                  p.highlight
                    ? "border-hero-blue bg-white ring-1 ring-hero-blue/30"
                    : "border-border bg-white"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-6 rounded-full bg-hero-blue px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                    Populaire
                  </span>
                )}
                <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  {p.name}
                </div>
                <div
                  className="mt-2 text-3xl font-extrabold"
                  style={{ fontFamily: "var(--font-label)" }}
                >
                  {priceLabel(p)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.price ? "par mois" : id === "trial" ? "14 jours" : " "}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{p.tagline}</p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {p.price === null ? (
                    <a
                      href="mailto:contact@orus-transit.sn?subject=Formule Entreprise"
                      className="block rounded-xl border border-hero-blue py-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-hero-blue hover:bg-hero-blue/5"
                    >
                      Nous contacter
                    </a>
                  ) : (
                    <Link
                      to="/auth"
                      search={{ mode: "signup" }}
                      className={`block rounded-xl py-2.5 text-center text-[11px] font-bold uppercase tracking-widest ${
                        p.highlight
                          ? "bg-hero-blue text-white hover:opacity-90"
                          : "border border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {id === "trial" ? "Commencer" : "Choisir"}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Les prix sont indicatifs et peuvent évoluer.{" "}
          <Link
            to="/"
            className="font-semibold text-hero-blue underline underline-offset-4"
          >
            Retour à l'accueil
          </Link>
        </p>
      </main>
    </div>
  );
}
