import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Anchor,
  CheckCircle2,
  Cloud,
  Container,
  Database,
  FileText,
  FolderKanban,
  GitBranch,
  Headphones,
  Lock,
  Menu,
  Ship,
  ShieldCheck,
  TrendingUp,
  X,
  Layers,
  Tag,
  LogIn,
  XCircle,
  Zap,
} from "lucide-react";
import logoAsset from "@/assets/newlogoblack.png";
import logoAstar from "@/assets/newlogo.png"
import logoOnDark from "@/assets/oruslogo.png";
import kebaLogo from "@/assets/keba-foundation.png";

export const Route = createFileRoute("/")({
  component: Landing,
});

// Images (photos libres Unsplash). Remplaçables ici en un coup d'œil.
const IMG = {
  hero: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1100&q=80",
  port: "https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&w=1100&q=80",
  yard: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1100&q=80",
};

const sora = { fontFamily: "var(--font-label)" };

// Masque proprement une image qui ne se charge pas (le dégradé reste visible).
const hideOnError = (e: { currentTarget: HTMLImageElement }) => {
  e.currentTarget.style.display = "none";
};

function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] 2xl:max-w-[1440px] items-center justify-between px-4 sm:px-8">
          <Link to="/" className="flex items-center">
            <img
              src={logoAstar}
              alt="ORUS TRANSIT"
              className="h-9 w-auto object-contain sm:h-10"
            />
          </Link>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-6 sm:flex ">
            <a
              href="#solution"
              className="text-sm font-medium text-muted-foreground inline-flex gap-1.5 items-center hover:text-blue-600 transition-colors"
            >
              <Layers size={16} />
              Solution
            </a>
            <a
              href="#port"
              className="inline-flex gap-1.5 items-center text-sm font-medium text-muted-foreground hover:text-blue-600 transition-colors"
            >
              <Anchor size={16} />
              Le port
            </a>
            <Link
              to="/tarifs"
              className="inline-flex gap-1.5 items-center text-sm font-medium text-muted-foreground hover:text-blue-600 transition-colors"
            >
              <Tag size={16} />
              Tarifs
            </Link>
            <Link
              to="/auth"
              className="inline-flex gap-1.5 items-center text-sm font-medium text-muted-foreground hover:text-blue-600 transition-colors"
            >
              <LogIn size={16} />
              Se connecter
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="font-poppins inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:opacity-90 hover:bg-blue-600"
            >
              Essai gratuit <ArrowRight className="size-3.5" />
            </Link>
          </nav>

          {/* Hamburger (mobile) */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            className="inline-flex items-center justify-center rounded p-2 text-foreground transition-colors hover:bg-black/5 sm:hidden"
          >
            <span
              className="transition-transform duration-300 ease-out"
              style={{
                transform: mobileOpen ? "rotate(90deg) scale(1.05)" : "rotate(0deg)",
              }}
            >
              {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </span>
          </button>
        </div>

        {mobileOpen && (
          <nav className="animate-menu-in border-t border-border bg-white px-4 py-4 sm:hidden">
            <div className="mx-auto flex max-w-[1200px] 2xl:max-w-[1440px] flex-col gap-2">
              <a href="#solution" onClick={() => setMobileOpen(false)} className="gap-1.5 inline-flex items-center rounded px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
                <Layers size={16} />
                Solution
              </a>
              <a href="#port" onClick={() => setMobileOpen(false)} className="gap-1.5 inline-flex items-center rounded px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
                <Anchor size={16} />
                Le port
              </a>
              <Link to="/tarifs" onClick={() => setMobileOpen(false)} className="gap-1.5 inline-flex items-center rounded px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              <Tag size={16} />
                Tarifs
              </Link>
              <Link to="/auth" onClick={() => setMobileOpen(false)} className="gap-1.5 inline-flex items-center rounded px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              <LogIn size={16} />
                Se connecter
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90"
              >
                Essai gratuit <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* ===================== HERO ===================== */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto grid w-full max-w-[1200px] 2xl:max-w-[1440px] items-center gap-10 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:py-20">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-hero-blue">
              <span className="font-poppins">Logiciel métier  commission en douane</span> 
            </p>
            <h1
              className="mt-3 text-balance text-4xl font-extrabold leading-[1.05] tracking-tighter sm:text-5xl lg:text-[3.4rem]"
              style={sora}
            >
              Le poste de commande des{" "}
              <span className="">transitaires sénégalais</span>.
            </h1>
            <div className="mt-6 h-1 w-20 bg-hero-blue" />
            <p className="font-poppins mt-6 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
              Centralisez vos dossiers d'importation, suivez chaque conteneur du
              connaissement au Bon à Enlever, et offrez à vos clients une
              visibilité totale, sans appels ni WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center gap-2 rounded-lg bg-hero-blue px-5 py-3 text-sm font-bold uppercase tracking-wider text-white hover:opacity-90"
              >
                Démarrer 7 jours d'essai <ArrowRight className="size-4" />
              </Link>
              <a
                href="#solution"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-3 text-sm font-semibold hover:bg-muted"
              >
                Voir comment
              </a>
            </div>
          </div>

          {/* Visuel conteneurs */}
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-hero-blue to-primary shadow-xl">
              <img
                src={IMG.hero}
                alt="Conteneurs sur un terminal portuaire"
                onError={hideOnError}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
            <div className="absolute -bottom-5 -left-2 hidden rounded-2xl border border-border bg-white p-4 shadow-lg sm:block">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Pipeline
              </div>
              <div className="mt-0.5 text-2xl font-extrabold" style={sora}>
                12 étapes
              </div>
              <div className="text-xs text-muted-foreground">
                du BL au Bon à Enlever
              </div>
            </div>
          </div>
        </div>

        {/* Mini-repères */}
        <div className="border-t border-border">
          <div className="mx-auto grid w-full max-w-[1200px] 2xl:max-w-[1440px] grid-cols-2 gap-x-4 gap-y-6 px-4 py-8 sm:grid-cols-4 sm:px-8">
            {[
              { icon: FolderKanban, title: "Suivi des dossiers", body: "En temps réel" },
              { icon: FileText, title: "Documents", body: "Centralisés & versionnés" },
              { icon: GitBranch, title: "Dédouanement", body: "Pipeline structuré" },
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
      </section>

      {/* ===================== PROBLÈME / SOLUTION ===================== */}
      <section id="solution" className="mx-auto w-full max-w-[1200px] 2xl:max-w-[1440px] px-4 py-16 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-widest text-hero-blue">
            <span className="font-poppins">Le problème</span> 
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl" style={sora}>
            Le dédouanement se gère encore à l'ancienne
          </h2>
          <p className="font-poppins mt-4 text-muted-foreground">
            Un cabinet suit des dizaines de dossiers en parallèle, chacun avec ses
            documents, ses échéances et ses interlocuteurs. Sans outil dédié, tout
            repose sur la mémoire, les fichiers Excel et les messages WhatsApp.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* Avant */}
          <div className="rounded-2xl border border-border bg-white p-7 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Aujourd'hui, sans ORUS
            </h3>
            <ul className="mt-5 space-y-3.5 text-sm">
              {[
                "Dossiers éparpillés entre Excel, cahiers et WhatsApp.",
                "Documents égarés ou retrouvés trop tard (BL, BAE, certificats).",
                "Clients importateurs qui appellent sans cesse pour un statut.",
                "Surestaries et magasinage qui explosent, faute d'alerte.",
                "Aucune vue d'ensemble sur la charge et les échéances.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <XCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
                  <span className="text-foreground/80">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Après */}
          <div className="rounded-2xl border border-hero-blue/30 bg-white p-7 shadow-sm ring-1 ring-hero-blue/10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-hero-blue">
              Avec ORUS TRANSIT
            </h3>
            <ul className="mt-5 space-y-3.5 text-sm">
              {[
                "Tous les dossiers dans un pipeline clair de 12 étapes horodatées.",
                "Documents versionnés, catégorisés et accessibles au bon moment.",
                "Portail client : vos importateurs suivent tout en autonomie.",
                "Compte à rebours surestaries et alertes automatiques.",
                "Tableau de bord temps réel, statistiques et journal d'activité.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span className="text-foreground/80">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trois piliers */}
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Container,
              title: "Pipeline de 12 étapes",
              body: "Du dossier créé au Bon à Enlever, chaque changement de statut est horodaté et notifié.",
            },
            {
              icon: FileText,
              title: "Documents centralisés",
              body: "BL, factures, certificats sanitaires : tous versionnés, catégorisés et accessibles au bon moment.",
            },
            {
              icon: ShieldCheck,
              title: "Portail client transparent",
              body: "Vos importateurs consultent leurs dossiers et téléchargent les documents autorisés.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <f.icon className="size-6 text-hero-blue" />
              <h3 className="mt-4 text-base font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== HISTOIRE DU PORT ===================== */}
      <section id="port" className="border-y border-border bg-muted/40">
        <div className="mx-auto grid w-full max-w-[1200px] 2xl:max-w-[1440px] items-center gap-10 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-hero-blue">
              Le Port de Dakar
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl" style={sora}>
              Un siècle et demi au carrefour de l'Afrique de l'Ouest
            </h2>
            <p className="font-poppins mt-4 text-muted-foreground">
              Porte d'entrée maritime du Sénégal et débouché du Mali enclavé, le
              Port autonome de Dakar est l'un des poumons économiques de la
              sous-région. En quinze ans, sa capacité a presque triplé, passant de
              265 000 à près de 800 000 conteneurs traités par an. Et le futur
              port en eau profonde de Ndayane hissera le pays dans une nouvelle
              dimension.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                ["≈ 800 000", "conteneurs / an"],
                ["15 M", "tonnes de fret"],
                ["18 m", "tirant d'eau à Ndayane"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl border border-border bg-white p-4">
                  <div className="text-xl font-extrabold text-hero-blue" style={sora}>
                    {v}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-hero-blue shadow-xl">
            <img
              src={IMG.port}
              alt="Grues et porte-conteneurs au port"
              onError={hideOnError}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        {/* Frise chronologique */}
        <div className="mx-auto w-full max-w-[1200px] 2xl:max-w-[1440px] px-4 pb-16 sm:px-8 sm:pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Anchor, year: "1857 · 1866", text: "Décision de créer un port à Dakar, puis inauguration." },
              { icon: Container, year: "1987", text: "Mise en service du premier terminal à conteneurs." },
              { icon: Ship, year: "2007", text: "Concession du terminal à conteneurs à DP World (25 ans)." },
              { icon: TrendingUp, year: "2012 · 2015", text: "Le trafic de marchandises passe de 10 à 15 M de tonnes." },
              { icon: Anchor, year: "2020", text: "Lancement du port en eau profonde de Ndayane (~1 Md $)." },
              { icon: Ship, year: "Demain", text: "Ndayane : 18 m de tirant d'eau, 1,5 million d'EVP." },
            ].map((s) => (
              <div key={s.year} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <s.icon className="size-5 text-hero-blue" />
                <div className="mt-3 text-sm font-extrabold" style={sora}>
                  {s.year}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== RETARD DIGITAL ===================== */}
      <section className="mx-auto w-full max-w-[1200px] 2xl:max-w-[1440px] px-4 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="relative order-last aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-hero-blue to-primary shadow-xl lg:order-first">
            <img
              src={IMG.yard}
              alt="Terminal à conteneurs vu du ciel"
              onError={hideOnError}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-hero-blue">
              Le vrai retard
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl" style={sora}>
              La douane s'est digitalisée. Les cabinets, pas encore.
            </h2>
            <p className="font-poppins mt-4 text-muted-foreground">
              Le Sénégal est un pionnier : dès 1990 le dédouanement passe à
              l'électronique avec GAINDE, et en 2004 le guichet unique ORBUS,
              4ᵉ du genre au monde, réduit les formalités de 8 jours à une
              demi-journée. En 2024, ORBUS Infinity dématérialise jusqu'à
              l'enlèvement des marchandises.
            </p>
            <p className="font-poppins mt-3 text-muted-foreground">
              Mais cette révolution s'est arrêtée aux portes de l'administration.
              Côté cabinets de transit, la gestion des dossiers et la relation
              client sont restées manuelles, et la profession n'a quasiment
              aucune vitrine digitale. <strong className="text-foreground">C'est
              exactement ce vide que comble ORUS TRANSIT.</strong>
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { icon: Database, v: "1990", l: "GAINDE" },
                { icon: Zap, v: "2004", l: "Guichet unique ORBUS" },
                { icon: TrendingUp, v: "8 j → ½ j", l: "de formalités" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-border bg-white p-4">
                  <s.icon className="size-5 text-hero-blue" />
                  <div className="mt-2 text-lg font-extrabold" style={sora}>
                    {s.v}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== BANDE ATOUTS ===================== */}
      <section className="bg-hero-blue text-white">
        <div className="mx-auto grid w-full max-w-[1200px] 2xl:max-w-[1440px] gap-px bg-white/20 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: GitBranch, title: "Conçu pour les pros.", body: "Pensé pour le terrain." },
            { icon: Lock, title: "Sécurisé.", body: "Données protégées et cloisonnées." },
            { icon: Cloud, title: "Accessible partout.", body: "Sur tous vos appareils." },
            { icon: Headphones, title: "Support dédié.", body: "À vos côtés à chaque étape." },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 bg-hero-blue px-4 py-6 sm:px-6">
              <item.icon className="mt-0.5 size-5 shrink-0 text-white/90" />
              <div>
                <div className="text-sm font-semibold leading-tight">{item.title}</div>
                <div className="mt-0.5 text-xs text-white/80">{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== CTA FINAL ===================== */}
      <section className="mx-auto w-full max-w-[1200px] 2xl:max-w-[1440px] px-4 py-16 sm:px-8 sm:py-20">
        <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm sm:p-12">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl" style={sora}>
            Passez votre cabinet au numérique
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            7 jours d'essai gratuit, sans engagement. Mettez de l'ordre dans vos
            dossiers dès aujourd'hui.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-lg bg-hero-blue px-6 py-3 text-sm font-bold uppercase tracking-wider text-white hover:opacity-90"
            >
              Démarrer maintenant <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/tarifs"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-6 py-3 text-sm font-semibold hover:bg-muted"
            >
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="bg-primary text-primary-foreground">
        <div className="mx-auto w-full max-w-[1200px] 2xl:max-w-[1440px] px-4 py-14 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <img
                src={logoAsset}
                alt="ORUS TRANSIT"
                className="h-12 w-auto rounded-lg object-contain"
              />
              <p className="mt-4 max-w-xs text-sm text-primary-foreground/70">
                Le poste de commande des commissionnaires en douane sénégalais.
              </p>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50">
                Navigation
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="#solution" className="text-primary-foreground/80 hover:text-white">Solution</a></li>
                <li><a href="#port" className="text-primary-foreground/80 hover:text-white">Le port</a></li>
                <li><Link to="/tarifs" className="text-primary-foreground/80 hover:text-white">Tarifs</Link></li>
                <li><Link to="/auth" className="text-primary-foreground/80 hover:text-white">Se connecter</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50">
                Légal
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link to="/conditions" className="text-primary-foreground/80 hover:text-white">Conditions d'utilisation</Link></li>
                <li><Link to="/confidentialite" className="text-primary-foreground/80 hover:text-white">Politique de confidentialité</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50">
                Contact
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-primary-foreground/80">
                <li>contact@orustransit.com</li>
                <li>Dakar, Sénégal</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
            <span className="text-xs text-primary-foreground/60">
              © {new Date().getFullYear()} ORUS TRANSIT · Dakar, Sénégal.
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
