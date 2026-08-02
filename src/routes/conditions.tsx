import { createFileRoute, Link } from "@tanstack/react-router";
import logoAsset from "@/assets/newlogo.png";

export const Route = createFileRoute("/conditions")({
  component: ConditionsPage,
  head: () => ({
    meta: [
      { title: "Conditions d'utilisation · ORUS TRANSIT" },
      {
        name: "description",
        content:
          "Conditions générales d'utilisation de la plateforme ORUS TRANSIT, le logiciel de dédouanement pour les commissionnaires en douane au Sénégal.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://orustransit.com/conditions" }],
  }),
});

const UPDATED = "15 juillet 2026";

function ConditionsPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <header className="border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-[1000px] items-center justify-between px-4 sm:px-8">
          <Link to="/" className="flex items-center">
            <img src={logoAsset} alt="ORUS TRANSIT" className="h-14 w-auto object-contain" />
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[820px] px-4 py-12 sm:px-8 sm:py-16">
        <p className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
          Document juridique
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tighter sm:text-5xl">
          Conditions Générales d'Utilisation
        </h1>
        <div className="mt-6 h-1 w-20 bg-hero-blue" />
        <p className="mt-6 text-sm text-muted-foreground">
          Dernière mise à jour : {UPDATED}
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/90">
          <Section n="1" title="Objet">
            <p>
              Les présentes Conditions Générales d'Utilisation (« CGU ») régissent
              l'accès et l'utilisation de la plateforme <strong>ORUS TRANSIT</strong>
              {" "}(le « Service »), un logiciel en ligne destiné aux
              commissionnaires en douane et transitaires exerçant au Sénégal. Le
              Service permet notamment la centralisation des dossiers d'importation,
              le suivi du pipeline de dédouanement, la gestion documentaire et la mise
              à disposition d'un portail de suivi pour les clients importateurs.
            </p>
            <p>
              En créant un compte ou en utilisant le Service, l'utilisateur reconnaît
              avoir lu et accepté sans réserve les présentes CGU.
            </p>
          </Section>

          <Section n="2" title="Définitions">
            <p>
              <strong>Éditeur</strong> : ORUS TRANSIT, éditeur du Service (ci-après
              « nous »). <strong>Utilisateur</strong> : toute personne disposant d'un
              compte (administrateur de cabinet, employé, ou client importateur).
              <strong> Cabinet</strong> : l'entreprise de commission en douane
              titulaire d'un espace de travail. <strong>Contenu</strong> : les
              données, dossiers, documents et informations saisis ou téléversés dans
              le Service.
            </p>
          </Section>

          <Section n="3" title="Description du Service">
            <p>
              Le Service offre, selon la formule souscrite : la création et le suivi de
              dossiers de dédouanement à travers un pipeline d'étapes horodatées, la
              gestion et le versionnage des documents (connaissement, factures,
              certificats, Bon à Enlever, etc.), la gestion des clients et des
              employés, un journal d'activité, un système de notifications, ainsi qu'un
              assistant d'aide basé sur l'intelligence artificielle à vocation
              purement informative.
            </p>
            <p>
              Les informations, montants de droits et taxes, délais ou procédures
              fournis par le Service (y compris par l'assistant IA) sont
              <strong> indicatifs</strong> et ne se substituent pas aux informations
              officielles de l'Administration des douanes sénégalaises. L'utilisateur
              demeure seul responsable de la vérification et de la conformité de ses
              déclarations.
            </p>
          </Section>

          <Section n="4" title="Inscription et compte">
            <p>
              L'accès au Service nécessite la création d'un compte au moyen d'une
              adresse e-mail valide et d'un mot de passe. L'utilisateur s'engage à
              fournir des informations exactes et à les tenir à jour. Il est
              responsable de la confidentialité de ses identifiants et de toute
              activité effectuée depuis son compte. Toute utilisation frauduleuse doit
              nous être signalée sans délai.
            </p>
          </Section>

          <Section n="5" title="Période d'essai et tarifs">
            <p>
              Le Service est proposé avec une période d'essai gratuite de 7 jours,
              sans engagement. À l'issue de l'essai, la poursuite de l'utilisation est
              soumise à la souscription de la formule payante, dont le tarif est
              communiqué avant toute facturation sur la page Tarifs. Le paiement est
              traité par un prestataire de paiement tiers ; l'abonnement se renouvelle
              mensuellement sauf résiliation par l'utilisateur.
            </p>
          </Section>

          <Section n="6" title="Obligations de l'utilisateur">
            <p>L'utilisateur s'engage à ne pas :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>utiliser le Service à des fins illicites ou frauduleuses ;</li>
              <li>
                téléverser des contenus dont il ne détient pas les droits ou qui
                portent atteinte aux droits de tiers ;
              </li>
              <li>
                tenter d'accéder sans autorisation aux données d'un autre cabinet, de
                contourner les mesures de sécurité ou de perturber le fonctionnement du
                Service ;
              </li>
              <li>
                copier, revendre ou exploiter le Service en dehors de l'usage prévu.
              </li>
            </ul>
          </Section>

          <Section n="7" title="Propriété intellectuelle">
            <p>
              Le Service, sa structure, son interface, ses marques et son code
              demeurent la propriété exclusive de l'Éditeur. Les présentes CGU ne
              confèrent qu'un droit d'utilisation personnel, non exclusif et non
              cessible. Le Contenu saisi par le Cabinet reste sa propriété ;
              l'utilisateur nous concède uniquement les droits nécessaires à
              l'hébergement et au fonctionnement du Service.
            </p>
          </Section>

          <Section n="8" title="Données personnelles">
            <p>
              Le traitement des données à caractère personnel effectué dans le cadre du
              Service est décrit dans notre{" "}
              <Link
                to="/confidentialite"
                className="font-semibold text-hero-blue underline underline-offset-4"
              >
                Politique de confidentialité
              </Link>
              , qui fait partie intégrante des présentes CGU.
            </p>
          </Section>

          <Section n="9" title="Disponibilité et maintenance">
            <p>
              Nous nous efforçons d'assurer la disponibilité du Service mais ne pouvons
              garantir un accès ininterrompu. Le Service peut être suspendu
              temporairement pour maintenance, mise à jour ou en cas de force majeure.
              Nous nous efforçons de prévenir des interruptions planifiées lorsque cela
              est possible.
            </p>
          </Section>

          <Section n="10" title="Responsabilité">
            <p>
              Le Service est fourni « en l'état ». Dans les limites permises par la loi,
              notre responsabilité ne saurait être engagée pour les dommages indirects,
              la perte de données résultant d'un usage non conforme, ou les décisions
              prises sur la base d'informations indicatives fournies par le Service.
              L'utilisateur est responsable de conserver des copies de ses documents
              essentiels.
            </p>
          </Section>

          <Section n="11" title="Suspension et résiliation">
            <p>
              Nous pouvons suspendre ou clôturer un compte en cas de manquement grave
              aux présentes CGU. L'utilisateur peut demander la fermeture de son compte
              à tout moment. À la clôture, les données sont traitées conformément à la
              Politique de confidentialité.
            </p>
          </Section>

          <Section n="12" title="Modification des CGU">
            <p>
              Les présentes CGU peuvent être modifiées afin de refléter l'évolution du
              Service ou de la réglementation. Les utilisateurs sont informés des
              modifications substantielles ; la poursuite de l'utilisation vaut
              acceptation de la version mise à jour.
            </p>
          </Section>

          <Section n="13" title="Droit applicable et litiges">
            <p>
              Les présentes CGU sont régies par le droit sénégalais. À défaut de
              résolution amiable, tout litige relatif à leur validité, leur
              interprétation ou leur exécution relève de la compétence des tribunaux
              compétents de Dakar, Sénégal.
            </p>
          </Section>

          <Section n="14" title="Contact">
            <p>
              Pour toute question relative aux présentes CGU, vous pouvez nous
              contacter à l'adresse : <strong>orus.contact@gmail.com</strong>.
              ORUS TRANSIT · Grand Mbao, Dakar, Sénégal.
            </p>
          </Section>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-[820px] px-4 text-xs text-muted-foreground sm:px-8">
          © {new Date().getFullYear()} ORUS TRANSIT · Grand Mbao, Dakar, Sénégal.
        </div>
      </footer>
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold tracking-tight">
        <span className="mr-2 text-hero-blue">{n}.</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
