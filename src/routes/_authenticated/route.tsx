import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Le super-administrateur ORUS TRANSIT a sa propre console.
    const { data: superRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "super_admin");
    if (superRole && superRole.length > 0) throw redirect({ to: "/console" });
    // Un importateur (client lié) est renvoyé vers son portail.
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (client) throw redirect({ to: "/portail" });
    return { user: data.user };
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
