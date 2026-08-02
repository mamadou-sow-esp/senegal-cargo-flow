import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Building2, LogOut, Sun, Moon } from "lucide-react";
import logoOnDark from "@/assets/newlogoblack.png";

export const Route = createFileRoute("/console")({
  ssr: false,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async () => {
    const { data: s } = await supabase.auth.getSession();
    const user = s.session?.user;
    if (!user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin");
    if (!roles || roles.length === 0) throw redirect({ to: "/dashboard" });
  },
  component: ConsoleLayout,
});

const NAV = [
  { to: "/console", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { to: "/console/cabinets", label: "Cabinets", icon: Building2, exact: false },
] as const;

function ConsoleLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const isActive = (n: (typeof NAV)[number]) =>
    n.exact ? pathname === n.to : pathname.startsWith(n.to);

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0d1526] text-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <img
                src={logoOnDark}
                alt="ORUS TRANSIT"
                className="h-8 w-auto object-contain"
              />
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                Console
              </span>
            </div>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive(n)
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <n.icon className="size-4" /> {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Basculer le thème"
              className="grid size-9 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" /> Déconnexion
            </button>
          </div>
        </div>
        <nav className="flex items-center gap-1 border-t border-white/10 px-4 py-2 sm:hidden">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                isActive(n) ? "bg-white/15 text-white" : "text-white/70"
              }`}
            >
              <n.icon className="size-3.5" /> {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
