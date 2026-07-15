import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import logoAsset from "@/assets/clearflower-logo.png.asset.json";

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

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded bg-white p-1">
            <img src={logoAsset.url} alt="Clear Flower" className="size-full object-contain" />
          </div>
          <span className="text-lg font-extrabold tracking-tighter">
            CLEAR FLOWER
          </span>
        </Link>
        <div>
          <p className="text-2xl font-semibold leading-snug tracking-tight text-balance">
            « Nous avons réduit de 30% le temps moyen de traitement de nos
            dossiers dès le premier mois. »
          </p>
          <p className="mt-4 text-sm text-primary-foreground/70">
            — Directeur d'opérations, transitaire au Port Autonome de Dakar
          </p>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50">
          Dakar · Sénégal
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:hidden"
          >
            ← Retour
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {mode === "signup" ? "Créer votre compte" : "Bon retour"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Démarrez votre essai Clear Flower en 30 secondes."
              : "Connectez-vous à votre espace transitaire."}
          </p>

          <button
            onClick={handleGoogle}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded border border-border bg-white px-4 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            <GoogleIcon /> Continuer avec Google
          </button>

          <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <Field
                label="Nom complet"
                type="text"
                value={fullName}
                onChange={setFullName}
                required
              />
            )}
            <Field
              label="Email professionnel"
              type="email"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              label="Mot de passe"
              type="password"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded bg-primary py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {loading
                ? "…"
                : mode === "signup"
                  ? "Créer mon compte"
                  : "Se connecter"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signup" ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="font-semibold text-foreground underline underline-offset-4"
            >
              {mode === "signup" ? "Se connecter" : "Créer un compte"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {props.label}
      </span>
      <input
        type={props.type}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        minLength={props.minLength}
        className="w-full rounded border border-input bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.52 1 10.2 1 12s.43 3.48 1.18 4.96l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
