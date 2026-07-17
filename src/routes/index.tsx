import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Cloud,
  Container,
  FileText,
  FolderKanban,
  GitBranch,
  Headphones,
  Lock,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import logoAsset from "@/assets/oruslogonobackground.png";
import logoOnDark from "@/assets/oruslogo.png";
import heroPort from "@/assets/banner.png";
import kebaLogo from "@/assets/keba-foundation.png";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-24 w-full max-w-[1400px] items-center justify-between px-4 sm:h-28 sm:px-8">
          <Link to="/" className="flex items-center">
            <img
              src={logoAsset}
              alt="ORUS TRANSIT"
              className="h-20 w-auto object-contain sm:h-24 md:h-28"
            />
          </Link>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-4 sm:flex">
            <Link
              to="/tarifs"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Tarifs
            </Link>
            <Link
              to="/auth"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Se connecter
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90"
            >
              Essai gratuit <ArrowRight className="size-3.5" />
            </Link>
          </nav>

          {/* Bouton hamburger (mobile) */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            className="inline-flex items-center justify-center rounded p-2 text-foreground hover:bg-black/5 sm:hidden"
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {/* Panneau mobile déroulant */}
        {mobileOpen && (
          <nav className="border-t border-border bg-white px-4 py-4 sm:hidden">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-2">
              <Link
                to="/tarifs"
                onClick={() => setMobileOpen(false)}
                className="rounded px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Tarifs
              </Link>
              <Link
                to="/auth"
                onClick={() => setMobileOpen(false)}
                className="rounded px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Se connecter
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded bg-primary px-4 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90"
              >
                Essai gratuit <ArrowRight className="size-3.5" />
              </Link>
              <div className="mt-1 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                <Link
                  to="/conditions"
                  onClick={() => setMobileOpen(false)}
                  className="hover:text-foreground"
                >
                  Conditions
                </Link>
                <Link
                  to="/confidentialite"
                  onClick={() => setMobileOpen(false)}
                  className="hover:text-foreground"
                >
                  Confidentialité
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Bannière horizontale pleine largeur, juste sous la nav */}
      <div className="w-full bg-white">
        <img
          src={heroPort}
          alt="Port avec conteneurs et grues"
          className="block h-auto w-full"
        />
      </div>

      <section className="relative w-full overflow-hidden bg-white">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-8 sm:py-16 lg:py-20">
          <div className="min-w-0">
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tighter sm:text-5xl lg:text-[3.25rem] xl:text-6xl">
              Le poste de commande des{" "}
              <span className="text-hero-blue">
                commissionnaires en douane sénégalais
              </span>
              .
            </h1>
            <div className="mt-6 h-1 w-20 bg-hero-blue" />
            <p className="mt-6 max-w-xl text-base text-muted-foreground text-pretty sm:text-lg">
              Centralisez vos dossiers d'importation, suivez chaque conteneur du
              connaissement au Bon à Enlever, et offrez à vos clients importateurs
              une visibilité totale — sans appels ni WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center gap-2 rounded bg-hero-blue px-5 py-3 text-sm font-bold uppercase tracking-wider text-white hover:opacity-90"
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

            <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-6 border-t border-border pt-8 sm:grid-cols-4">
              {[
                { icon: FolderKanban, title: "Suivi des dossiers", body: "En temps réel" },
                { icon: FileText, title: "Gestion des documents", body: "Centralisée" },
                { icon: GitBranch, title: "Pipeline de dédouanement", body: "Structuré et efficace" },
                { icon: ShieldCheck, title: "Transparence client", body: "À chaque étape" },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <f.icon className="mt-0.5 size-5 shrink-0 text-hero-blue" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight">{f.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{f.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>


        <div className="bg-hero-blue text-white">
          <div className="mx-auto grid w-full max-w-[1400px] gap-px bg-white/20 sm:grid-cols-2 lg:grid-cols-4">

            {[
              {
                icon: Award,
                title: "Conçu pour les pros.",
                body: "Pensé pour la performance.",
              },
              {
                icon: Lock,
                title: "Sécurisé.",
                body: "Données protégées.",
              },
              {
                icon: Cloud,
                title: "Accessible partout.",
                body: "Sur tous vos appareils.",
              },
              {
                icon: Headphones,
                title: "Support dédié.",
                body: "À vos côtés à chaque étape.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 bg-hero-blue px-4 py-5 sm:px-6 sm:py-6"
              >
                <item.icon className="mt-0.5 size-5 shrink-0 text-white/90" />
                <div>
                  <div className="text-sm font-semibold leading-tight">
                    {item.title}
                  </div>
                  <div className="mt-0.5 text-xs text-white/80">{item.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-8 sm:py-24">
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

      <footer className="bg-primary text-primary-foreground">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Marque */}
            <div>
              <img
                src={logoOnDark}
                alt="ORUS TRANSIT"
                className="h-16 w-auto rounded-lg object-contain"
              />
              <p className="mt-4 max-w-xs text-sm text-primary-foreground/70">
                Le poste de commande des commissionnaires en douane sénégalais.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50">
                Navigation
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link to="/" className="text-primary-foreground/80 hover:text-white">
                    Accueil
                  </Link>
                </li>
                <li>
                  <Link to="/auth" className="text-primary-foreground/80 hover:text-white">
                    Se connecter
                  </Link>
                </li>
                <li>
                  <Link
                    to="/auth"
                    search={{ mode: "signup" }}
                    className="text-primary-foreground/80 hover:text-white"
                  >
                    Essai gratuit
                  </Link>
                </li>
              </ul>
            </div>

            {/* Légal */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50">
                Légal
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link
                    to="/conditions"
                    className="text-primary-foreground/80 hover:text-white"
                  >
                    Conditions d'utilisation
                  </Link>
                </li>
                <li>
                  <Link
                    to="/confidentialite"
                    className="text-primary-foreground/80 hover:text-white"
                  >
                    Politique de confidentialité
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact — à compléter */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50">
                Contact
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-primary-foreground/80">
                <li>[email de contact]</li>
                <li>[téléphone]</li>
                <li>Dakar, Sénégal</li>
              </ul>
            </div>
          </div>

          {/* Barre du bas */}
          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
            <span className="text-xs text-primary-foreground/60">
              © {new Date().getFullYear()} ORUS TRANSIT — Dakar, Sénégal.
            </span>
            <div className="flex items-center gap-2.5 text-xs text-primary-foreground/60">
              <span>Un projet de</span>
              <img
                src={kebaLogo}
                alt="Keba Foundation"
                className="h-8 w-auto object-contain sm:h-9"
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
