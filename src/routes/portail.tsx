import {
  createFileRoute,
  redirect,
  Outlet,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import logoAsset from "@/assets/newlogo.png";

const sora = { fontFamily: "var(--font-label)" } as const;

export const Route = createFileRoute("/portail")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!client) throw redirect({ to: "/dashboard" });
  },
  component: PortailLayout,
});

function PortailLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["portail-me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("clients")
        .select("name")
        .eq("user_id", u.user!.id)
        .maybeSingle();
      return { name: data?.name ?? "Client", email: u.user?.email ?? "" };
    },
  });

  const signOut = async () => {
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/portail" className="flex items-center gap-3">
            <img
              src={logoAsset}
              alt="ORUS TRANSIT"
              className="h-9 w-auto object-contain"
            />
            <div>
              <div className="text-sm font-bold" style={sora}>
                Portail client
              </div>
              <div className="text-[10px] text-muted-foreground">
                {me?.name}
              </div>
            </div>
          </Link>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-black/5 hover:text-foreground"
          >
            <LogOut className="size-4" /> Déconnexion
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
