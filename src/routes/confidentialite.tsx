import { createFileRoute, Link } from "@tanstack/react-router";
import logoAsset from "@/assets/oruslogonobackground.png";

export const Route = createFileRoute("/confidentialite")({
  component: ConfidentialitePage,
  head: () => ({
    meta: [{ title: "Politique de confidentialité · ORUS TRANSIT" }],
  }),
});

const UPDATED = "15 juillet 2026";

function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
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
          Protection des données
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tighter sm:text-5xl">
          Politique de confidentialité
        </h1>
        <div className="mt-6 h-1 w-20 bg-hero-blue" />
        <p className="mt-6 text-sm text-muted-foreground">
          Dernière mise à jour : {UPDATED}
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/90">
          <Section n="1" title="Introduction">
            <p>
              La présente politique décrit la manière dont <strong>ORUS TRANSIT</strong>
              {" "}(« nous ») collecte, utilise, conserve et protège les données à
              caractère personnel dans le cadre de sa plateforme de gestion du
              dédouanement destinée aux commissionnaires en douane au Sénégal. Elle
              s'inscrit dans le respect de la{" "}
              <strong>
                loi n° 2008-12 du 25 janvier 2008 sur la protection des données à
                caractère personnel
              </strong>{" "}
              et des recommandations de la{" "}
              <strong>Commission de Protection des Données Personnelles (CDP)</strong>{" "}
              du Sénégal.
            </p>
          </Section>

          <Section n="2" title="Responsable du traitement">
            <p>
              Le responsable du traitement est ORUS TRANSIT, [raison sociale],
              [adresse], Dakar, Sénégal. Pour toute question relative à vos données,
              vous pouvez nous écrire à <strong>contact@orustransit.com</strong>.
            </p>
            <p>
              Lorsqu'un cabinet de commission en douane utilise le Service pour gérer
              les données de ses propres clients importateurs, ce cabinet agit comme
              responsable du traitement de ces données, ORUS TRANSIT intervenant alors
              en qualité de sous-traitant au sens de la loi.
            </p>
          </Section>

          <Section n="3" title="Données que nous collectons">
            <p>Dans le cadre du Service, nous traitons notamment :</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Données de compte</strong> : nom complet, adresse e-mail,
                numéro de téléphone, fonction, et mot de passe (stocké sous forme
                chiffrée).
              </li>
              <li>
                <strong>Données des clients importateurs</strong> saisies par le
                cabinet : raison sociale, personne de contact, e-mail, téléphone,
                adresse, numéros d'identification (NINEA, RCCM).
              </li>
              <li>
                <strong>Données des dossiers de dédouanement</strong> : références,
                navire, connaissement (BL), conteneurs, marchandises, valeurs,
                statuts, échéances.
              </li>
              <li>
                <strong>Documents</strong> téléversés (factures, certificats,
                déclarations, Bon à Enlever, etc.) stockés de manière sécurisée.
              </li>
              <li>
                <strong>Données d'usage</strong> : journal d'activité, historique des
                changements de statut, notifications, et données techniques
                nécessaires à la sécurité (adresse IP, horodatage de connexion).
              </li>
              <li>
                <strong>Échanges avec l'assistant IA</strong> : les messages que vous
                envoyez à l'assistant pour obtenir une réponse.
              </li>
            </ul>
          </Section>

          <Section n="4" title="Finalités du traitement">
            <p>Ces données sont traitées afin de :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>fournir, sécuriser et améliorer le Service ;</li>
              <li>gérer les comptes, les accès et les rôles au sein d'un cabinet ;</li>
              <li>
                permettre le suivi des dossiers et la mise à disposition des documents
                aux personnes autorisées ;
              </li>
              <li>envoyer des notifications liées à l'activité des dossiers ;</li>
              <li>répondre aux demandes adressées à l'assistant IA ;</li>
              <li>respecter nos obligations légales et prévenir la fraude.</li>
            </ul>
          </Section>

          <Section n="5" title="Base légale">
            <p>
              Les traitements reposent, selon les cas, sur l'exécution du contrat
              (fourniture du Service), notre intérêt légitime (sécurité, amélioration),
              le respect d'obligations légales, et, le cas échéant, le consentement de
              la personne concernée.
            </p>
          </Section>

          <Section n="6" title="Hébergement et sous-traitants">
            <p>
              Pour fonctionner, le Service s'appuie sur des prestataires techniques qui
              agissent en tant que sous-traitants et n'utilisent les données que pour
              les besoins du Service :
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Supabase</strong> : hébergement de la base de données,
                authentification et stockage des documents.
              </li>
              <li>
                <strong>Groq</strong> : traitement des messages envoyés à
                l'assistant IA afin de générer une réponse.
              </li>
            </ul>
            <p>
              Certaines de ces infrastructures peuvent être situées hors du Sénégal. Le
              cas échéant, tout transfert est encadré par des garanties appropriées,
              conformément à la loi n° 2008-12.
            </p>
          </Section>

          <Section n="7" title="Durée de conservation">
            <p>
              Les données sont conservées pendant la durée d'utilisation du Service,
              puis pendant les délais nécessaires au respect de nos obligations légales
              et comptables. À la clôture d'un compte, les données sont supprimées ou
              anonymisées dans un délai raisonnable, sauf obligation légale de
              conservation.
            </p>
          </Section>

          <Section n="8" title="Sécurité">
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles
              appropriées : chiffrement des communications, cloisonnement des données
              par cabinet (sécurité au niveau des lignes / Row Level Security),
              contrôle des accès par rôle, et stockage des mots de passe sous forme
              chiffrée. Aucune transmission sur Internet n'étant totalement infaillible,
              nous ne pouvons garantir une sécurité absolue mais nous nous engageons à
              réagir sans délai en cas d'incident.
            </p>
          </Section>

          <Section n="9" title="Vos droits">
            <p>
              Conformément à la loi n° 2008-12, vous disposez d'un droit d'accès, de
              rectification, d'opposition, de suppression et de limitation concernant
              vos données. Vous pouvez exercer ces droits en nous écrivant à{" "}
              <strong>contact@orustransit.com</strong>. Si un cabinet est responsable de vos
              données (en tant que client importateur), votre demande peut être
              adressée directement à ce cabinet.
            </p>
            <p>
              Vous avez également le droit d'introduire une réclamation auprès de la
              Commission de Protection des Données Personnelles (CDP) du Sénégal.
            </p>
          </Section>

          <Section n="10" title="Cookies et stockage local">
            <p>
              Le Service utilise le stockage local du navigateur uniquement pour
              maintenir votre session d'authentification et le bon fonctionnement de
              l'application. Il n'est pas utilisé à des fins publicitaires ni de suivi
              comportemental.
            </p>
          </Section>

          <Section n="11" title="Modification de la politique">
            <p>
              Cette politique peut être mise à jour pour refléter l'évolution du Service
              ou de la réglementation. La date de dernière mise à jour figure en tête du
              document. En cas de modification substantielle, nous en informons les
              utilisateurs.
            </p>
          </Section>

          <Section n="12" title="Contact">
            <p>
              Pour toute question relative à cette politique ou à vos données
              personnelles : <strong>contact@orustransit.com</strong>. ORUS TRANSIT,
              [raison sociale], [adresse], Dakar, Sénégal.
            </p>
          </Section>
        </div>

        <div className="mt-12 rounded border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          Ce document est un modèle fourni à titre indicatif. Il doit être complété
          (raison sociale, adresse, contact, éventuel délégué à la protection des
          données) et relu par un conseil juridique avant sa mise en ligne définitive.
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-[820px] px-4 text-xs text-muted-foreground sm:px-8">
          © {new Date().getFullYear()} ORUS TRANSIT · Dakar, Sénégal.
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
