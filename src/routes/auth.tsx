import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import logoAsset from "@/assets/clearflower-logo.png.asset.json";
import heroPort from "@/assets/hero-port.png.asset.json";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({
    meta: [{ title: "Connexion — Clear Flower" }],
  }),
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) toast.error(res.error.message ?? "Erreur Google");
    if (res.redirected) return;
    navigate({ to: "/dashboard" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Compte créé. Configurez votre entreprise.");
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.2fr_1fr]">
      {/* Visual side */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:block">
        <img
          src={heroPort.url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/70" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg bg-white p-1.5 shadow-lg">
              <img src={logoAsset.url} alt="Clear Flower" className="size-full object-contain" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">CLEAR FLOWER</span>
          </Link>

          <div className="max-w-lg space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Port Autonome de Dakar
            </div>
            <blockquote className="text-3xl font-semibold leading-tight tracking-tight text-balance xl:text-4xl">
              « Nous avons réduit de 30 % le temps moyen de traitement de nos dossiers dès le premier mois. »
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-white/10 text-sm font-bold">
                MD
              </div>
              <div className="text-sm">
                <div className="font-semibold">Directeur d'opérations</div>
                <div className="text-primary-foreground/60">Commissionnaire agréé en douane</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <Metric value="30 %" label="Temps gagné" />
              <Metric value="24/7" label="Suivi dossiers" />
              <Metric value="100 %" label="Conforme GAINDE" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50">
            <span>Dakar · Sénégal</span>
            <span>© {new Date().getFullYear()} Clear Flower</span>
          </div>
        </div>
      </aside>

      {/* Form side */}
      <main className="flex items-center justify-center bg-background px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:hidden"
          >
            ← Retour à l'accueil
          </Link>

          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-lg bg-primary p-1.5">
              <img src={logoAsset.url} alt="Clear Flower" className="size-full object-contain" />
            </div>
            <span className="text-base font-extrabold tracking-tight">CLEAR FLOWER</span>
          </div>

          {/* Segmented control */}
          <div className="mb-8 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1">
            <SegButton active={!isSignup} onClick={() => setMode("signin")}>
              Se connecter
            </SegButton>
            <SegButton active={isSignup} onClick={() => setMode("signup")}>
              Créer un compte
            </SegButton>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {isSignup ? "Créez votre espace" : "Bon retour parmi nous"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignup
              ? "Configurez votre cabinet en moins de 2 minutes."
              : "Reprenez le suivi de vos dossiers de dédouanement."}
          </p>

          <button
            onClick={handleGoogle}
            className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:border-foreground/30 hover:shadow"
          >
            <GoogleIcon /> Continuer avec Google
          </button>

          <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou par email <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              onChange={setEmail}
              placeholder="vous@cabinet.sn"
              required
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
              className="mt-2 w-full rounded-lg bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Chargement…" : isSignup ? "Créer mon compte" : "Se connecter"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            En continuant, vous acceptez nos{" "}
            <a href="#" className="font-semibold text-foreground underline underline-offset-4">
              conditions
            </a>{" "}
            et notre{" "}
            <a href="#" className="font-semibold text-foreground underline underline-offset-4">
              politique de confidentialité
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/60">
        {label}
      </div>
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
      className={`rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
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
        className="w-full rounded-lg border border-input bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-ring/40"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.52 1 10.2 1 12s.43 3.48 1.18 4.96l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
