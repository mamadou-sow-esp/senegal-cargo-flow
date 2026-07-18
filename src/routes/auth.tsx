import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { FolderKanban, FileText, GitBranch, ShieldCheck, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/newlogo.png";
import logoOnDark from "@/assets/newlogoblack.png";
import heroPort from "@/assets/banner.png";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({
    meta: [{ title: "Connexion — ORUS TRANSIT" }],
  }),
});

const FEATURES = [
  { icon: FolderKanban, title: "Suivi des dossiers", body: "En temps réel" },
  { icon: FileText, title: "Gestion des documents", body: "Centralisée" },
  { icon: GitBranch, title: "Pipeline de dédouanement", body: "Structuré et efficace" },
  { icon: ShieldCheck, title: "Transparence client", body: "À chaque étape" },
];

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const isEmailValid = (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const emailRedirect = () => `${window.location.origin}/dashboard`;

  const handleResend = async () => {
    if (!sentTo) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sentTo,
      options: { emailRedirectTo: emailRedirect() },
    });
    if (error) toast.error(error.message);
    else toast.success("Email renvoyé.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid(email)) {
      setEmailError("Format d'email invalide (ex. : nom@cabinet.sn).");
      return;
    }
    setEmailError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        // Intention « Pro » choisie sur la page Tarifs : on la stocke dans le
        // compte (métadonnées) pour qu'elle survive à un changement de
        // navigateur lors de la confirmation par e-mail.
        let payIntent: string | null = null;
        try {
          payIntent = localStorage.getItem("orus_pay_intent");
        } catch {
          /* ignore */
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: emailRedirect(),
            data: {
              full_name: fullName,
              ...(payIntent === "pro" ? { pay_intent: "pro" } : {}),
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          // Confirmation par email requise : pas encore de session.
          setSentTo(email);
        } else {
          // Confirmation désactivée : connexion immédiate.
          navigate({ to: "/onboarding" });
        }
      } else {
        const { data: signIn, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        const uid = signIn.user?.id;
        // Super-admin ORUS TRANSIT → sa console.
        const { data: superRole } = uid
          ? await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", uid)
              .eq("role", "super_admin")
          : { data: null };
        if (superRole && superRole.length > 0) {
          navigate({ to: "/console" });
        } else {
          // Un importateur invité est dirigé vers son portail client.
          const { data: client } = uid
            ? await supabase
                .from("clients")
                .select("id")
                .eq("user_id", uid)
                .maybeSingle()
            : { data: null };
          navigate({ to: client ? "/portail" : "/dashboard" });
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.2fr_1fr]">
      {/* Panneau visuel — même identité bleue que la homepage */}
      <aside className="relative hidden overflow-hidden bg-hero-blue text-white lg:block">
        <img
          src={heroPort}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-hero-blue via-hero-blue/95 to-hero-blue/70" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Link to="/" className="inline-flex w-fit items-center">
            <img
              src={logoOnDark}
              alt="ORUS TRANSIT"
              className="h-24 w-auto rounded-xl object-contain"
            />
          </Link>

          <div className="max-w-lg">
            <h2 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tighter xl:text-5xl">
              Le poste de commande de vos dossiers de dédouanement.
            </h2>
            <div className="mt-6 h-1 w-16 bg-white/80" />

            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-7 border-t border-white/15 pt-8">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <f.icon className="mt-0.5 size-5 shrink-0 text-white/90" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight">{f.title}</div>
                    <div className="mt-0.5 text-xs text-white/75">{f.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/50">
            <span>Dakar · Sénégal</span>
            <span>© {new Date().getFullYear()} ORUS TRANSIT</span>
          </div>
        </div>
      </aside>

      {/* Panneau formulaire */}
      <main className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:hidden"
          >
            ← Retour à l'accueil
          </Link>

          <div className="mb-8 flex items-center lg:hidden">
            <img src={logoAsset} alt="ORUS TRANSIT" className="h-16 w-auto object-contain" />
          </div>

          {sentTo ? (
            <div className="animate-in-up">
              <div className="flex size-12 items-center justify-center rounded bg-hero-blue/10 text-hero-blue">
                <Mail className="size-6" />
              </div>
              <h1 className="mt-6 text-3xl font-extrabold tracking-tighter sm:text-4xl">
                Vérifiez votre boîte mail
              </h1>
              <div className="mt-4 h-1 w-16 bg-hero-blue" />
              <p className="mt-4 text-sm text-muted-foreground">
                Nous avons envoyé un lien de confirmation à{" "}
                <strong className="text-foreground">{sentTo}</strong>. Cliquez dessus
                pour activer votre compte — vous serez ensuite redirigé vers votre
                espace.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Pensez à vérifier vos spams si vous ne le voyez pas.
              </p>
              <button
                type="button"
                onClick={handleResend}
                className="mt-8 w-full rounded border border-border bg-white py-3 text-sm font-semibold transition hover:bg-muted"
              >
                Renvoyer l'email
              </button>
              <button
                type="button"
                onClick={() => {
                  setSentTo(null);
                  setMode("signin");
                }}
                className="mt-3 w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                ← Revenir à la connexion
              </button>
            </div>
          ) : (
          <>
          {/* Onglets */}
          <div className="mb-8 grid grid-cols-2 gap-1 rounded border border-border bg-muted/40 p-1">
            <SegButton active={!isSignup} onClick={() => setMode("signin")}>
              Se connecter
            </SegButton>
            <SegButton active={isSignup} onClick={() => setMode("signup")}>
              Créer un compte
            </SegButton>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tighter sm:text-4xl">
            {isSignup ? "Créez votre espace" : "Bon retour parmi nous"}
          </h1>
          <div className="mt-4 h-1 w-16 bg-hero-blue" />
          <p className="mt-4 text-sm text-muted-foreground">
            {isSignup
              ? "Configurez votre cabinet en moins de 2 minutes."
              : "Reprenez le suivi de vos dossiers de dédouanement."}
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
            {isSignup && (
              <Field
                label="Nom complet"
                type="text"
                value={fullName}
                onChange={setFullName}
                placeholder="Aminata Diop"
                required
              />
            )}
            <Field
              label="Email professionnel"
              type="email"
              value={email}
              onChange={(v) => {
                setEmail(v);
                if (emailError) setEmailError(null);
              }}
              placeholder="vous@cabinet.sn"
              required
              error={emailError ?? undefined}
            />
            <Field
              label="Mot de passe"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Minimum 6 caractères"
              required
              minLength={6}
            />

            {!isSignup && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded bg-hero-blue py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Chargement…" : isSignup ? "Créer mon compte" : "Se connecter"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            En continuant, vous acceptez nos{" "}
            <Link
              to="/conditions"
              className="font-semibold text-foreground underline underline-offset-4"
            >
              conditions
            </Link>{" "}
            et notre{" "}
            <Link
              to="/confidentialite"
              className="font-semibold text-foreground underline underline-offset-4"
            >
              politique de confidentialité
            </Link>
            .
          </p>
          </>
          )}
        </div>
      </main>
    </div>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
        active
          ? "bg-white text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Field(props: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {props.label}
      </span>
      <input
        type={props.type}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        minLength={props.minLength}
        placeholder={props.placeholder}
        aria-invalid={props.error ? true : undefined}
        className={`w-full rounded border bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:ring-2 ${
          props.error
            ? "border-destructive focus:border-destructive focus:ring-destructive/25"
            : "border-input focus:border-hero-blue focus:ring-hero-blue/25"
        }`}
      />
      {props.error && (
        <span className="mt-1.5 block text-xs font-medium text-destructive">
          {props.error}
        </span>
      )}
    </label>
  );
}
