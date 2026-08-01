import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/newlogo.png";

const sora = { fontFamily: "var(--font-label)" } as const;

export const Route = createFileRoute("/invitation")({
  ssr: false,
  head: () => ({ meta: [{ title: "Bienvenue · ORUS TRANSIT" }] }),
  component: Invitation,
});

function Invitation() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    // La session est établie par le lien d'invitation (detectSessionInUrl).
    supabase.auth.getUser().then(({ data }) => {
      setReady(!!data.user);
      setName(
        (data.user?.user_metadata?.full_name as string | undefined) ?? null,
      );
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bienvenue ! Votre accès est actif.");
    navigate({ to: "/portail" });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <img
            src={logoAsset}
            alt="ORUS TRANSIT"
            className="h-16 w-auto object-contain"
          />
        </div>
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight" style={sora}>
            Bienvenue{name ? `, ${name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choisissez un mot de passe pour activer votre accès au portail de
            suivi de vos dossiers.
          </p>

          {!ready ? (
            <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
              Lien d'invitation invalide ou expiré. Demandez à votre
              transitaire de vous renvoyer une invitation.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Mot de passe
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="w-full rounded-lg border border-input bg-white px-3.5 py-2.5 text-sm outline-none focus:border-hero-blue focus:ring-2 focus:ring-hero-blue/25"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-hero-blue py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "…" : "Activer mon accès"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
