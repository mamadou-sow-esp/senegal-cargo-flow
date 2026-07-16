import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCog,
  FileText,
  BarChart3,
  LogOut,
  Search,
  Plus,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AiAssistant } from "@/components/ai-assistant";
import logoAsset from "@/assets/logo.png";


const NAV = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/dossiers", label: "Dossiers", icon: FolderKanban },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/employes", label: "Employés", icon: UserCog },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/statistiques", label: "Statistiques", icon: BarChart3 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Ferme le tiroir mobile à chaque changement de page
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const { data: profile } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      setEmail(u.user.email ?? null);
      const { data } = await supabase
        .from("profiles")
        .select("company_id, full_name, companies(name)")
        .eq("id", u.user.id)
        .maybeSingle();
      setCompanyName(data?.companies?.name ?? null);
      return data;
    },
  });

  useEffect(() => {
    if (profile && !profile.company_id && pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [profile, pathname, navigate]);

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initials = (profile?.full_name || email || "?")
    .split(/[\s@]+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <Link to="/dashboard" className="flex flex-col items-center gap-1 p-4">
          <img src={logoAsset} alt="Clear Flower" className="h-20 w-auto object-contain" />
          <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">
            {companyName ?? "—"}
          </div>
        </Link>

        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map((n) => {
            const active =
              pathname === n.to ||
              (n.to !== "/dashboard" && pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary/5 font-medium text-primary"
                    : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                }`}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded px-2 py-2">
            <div className="grid size-8 place-items-center rounded-full bg-muted text-[10px] font-bold">
              {initials || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">
                {profile?.full_name || "Utilisateur"}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {email}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Déconnexion"
              className="rounded p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Ouvrir le menu"
              className="rounded p-2 text-muted-foreground hover:bg-black/5 hover:text-foreground lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <Link
              to="/dashboard"
              className="flex items-center lg:hidden"
            >
              <img src={logoAsset} alt="Clear Flower" className="h-10 w-auto object-contain" />
            </Link>
            <div className="hidden items-center gap-3 rounded border border-border bg-muted/50 px-3 py-1.5 md:flex">
              <Search className="size-3.5 text-muted-foreground" />
              <input
                placeholder="Rechercher (BL, conteneur, client…)"
                className="w-72 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded border border-border bg-white px-1.5 text-[10px] font-mono text-muted-foreground">
                ⌘ K
              </kbd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dossiers/new"
              className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90"
            >
              <Plus className="size-3.5" /> Nouveau dossier
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>

      {/* Tiroir de navigation mobile */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 max-w-[80%] flex-col border-r border-border bg-sidebar shadow-xl">
            <div className="flex items-center justify-between p-4">
              <Link
                to="/dashboard"
                className="flex flex-col"
                onClick={() => setMobileNavOpen(false)}
              >
                <img src={logoAsset} alt="Clear Flower" className="h-12 w-auto object-contain" />
                <span className="mt-1 truncate text-[10px] uppercase tracking-widest text-muted-foreground">
                  {companyName ?? "—"}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Fermer le menu"
                className="rounded p-2 text-muted-foreground hover:bg-black/5 hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-0.5 px-3">
              {NAV.map((n) => {
                const active =
                  pathname === n.to ||
                  (n.to !== "/dashboard" && pathname.startsWith(n.to));
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-primary/5 font-medium text-primary"
                        : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                    }`}
                  >
                    <n.icon className="size-4" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border p-3">
              <div className="flex items-center gap-3 rounded px-2 py-2">
                <div className="grid size-8 place-items-center rounded-full bg-muted text-[10px] font-bold">
                  {initials || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">
                    {profile?.full_name || "Utilisateur"}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {email}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Déconnexion"
                  className="rounded p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <AiAssistant />
    </div>

  );
}
