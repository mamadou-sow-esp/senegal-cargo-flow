import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/newlogo.png";

export const Route = createFileRoute("/reset")({
  ssr: false,
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("6 caractères minimum.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Mot de passe mis à jour.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Lien expiré. Redemandez un email de réinitialisation.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen overflow-x-clip place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <img
          src={logoAsset}
          alt="ORUS TRANSIT"
          className="mx-auto h-12 w-auto object-contain"
        />
        <h1
          className="mt-6 text-center text-2xl font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-label)" }}
        >
          Nouveau mot de passe
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Choisissez un nouveau mot de passe pour votre compte.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Mot de passe
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              placeholder="Minimum 6 caractères"
              className="w-full rounded border border-input bg-white px-3 py-2 text-base outline-none focus:border-hero-blue focus:ring-2 focus:ring-hero-blue/25 sm:text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-hero-blue py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "…" : "Mettre à jour"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="font-semibold text-hero-blue hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
