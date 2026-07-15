import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Container, FileText, ShieldCheck } from "lucide-react";
import logoAsset from "@/assets/clearflower-logo.png.asset.json";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white/60 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-8">
          <Link to="/" className="flex items-center">
            <img src={logoAsset.url} alt="Clear Flower" className="h-16 w-auto object-contain sm:h-20 md:h-24" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/auth"
              className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-block"
            >
              Se connecter
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 sm:px-4"
            >
              Essai gratuit <ArrowRight className="size-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 pt-16 pb-16 sm:px-8 sm:pt-24">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tighter text-balance sm:text-5xl md:text-6xl lg:text-7xl">
            Le poste de commande des commissionnaires en douane sénégalais.
          </h1>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground text-pretty sm:text-lg">
            Centralisez vos dossiers d'importation, suivez chaque conteneur du
            connaissement au Bon à Enlever, et offrez à vos clients importateurs
            une visibilité totale — sans appels ni WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90"
            >
              Démarrer 14 jours d'essai <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded border border-border bg-white px-5 py-3 text-sm font-semibold hover:bg-muted"
            >
              Se connecter
            </Link>
          </div>
        </div>


        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Container,
              title: "Pipeline de 12 étapes",
              body: "Du dossier créé au Bon à Enlever, chaque changement de statut est horodaté et notifié.",
            },
            {
              icon: FileText,
              title: "Documents centralisés",
              body: "BL, factures, certificats sanitaires — versionnés, catégorisés, accessibles au bon moment.",
            },
            {
              icon: ShieldCheck,
              title: "Portail client transparent",
              body: "Vos importateurs consultent leurs dossiers et téléchargent les documents autorisés.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded border border-border bg-white p-6"
            >
              <f.icon className="size-5 text-accent" />
              <h3 className="mt-4 text-base font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded border border-border bg-white p-8">
          <div className="grid gap-6 md:grid-cols-4">
            {[
              ["Dossiers suivis / mois", "1 200+"],
              ["Réduction du délai moyen", "-28%"],
              ["Documents oubliés", "-91%"],
              ["Transitaires équipés", "40+"],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {label}
                </div>
                <div className="mt-1 font-mono text-3xl font-extrabold">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <ul className="mt-10 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          {[
            "Tableau de bord temps réel",
            "Gestion des clients et employés",
            "Historique complet et journal d'activité",
            "Alertes échéances et documents manquants",
            "Prêt pour l'intégration WhatsApp / SMS / e-mail",
            "Architecture prête pour l'IA (analyse de docs, scoring)",
          ].map((i) => (
            <li key={i} className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-accent" /> {i}
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Clear Flower — Dakar, Sénégal.
        </div>
      </footer>
    </div>
  );
}
