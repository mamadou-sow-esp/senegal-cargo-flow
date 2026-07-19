import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Garde légère : uniquement la présence de session (locale, instantanée),
    // AUCUN appel réseau ici → plus de requêtes répétées à chaque navigation.
    // Les redirections super-admin / client sont faites UNE fois dans l'app-shell.
    const { data: s } = await supabase.auth.getSession();
    const user = s.session?.user;
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: LayoutComponent,
});

function LayoutComponent() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
