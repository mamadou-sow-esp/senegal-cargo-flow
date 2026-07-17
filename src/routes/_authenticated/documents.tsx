import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  FolderKanban,
  ArrowUpRight,
  ChevronRight,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents")({
  component: DocumentsPage,
});

const sora = { fontFamily: "var(--font-label)" } as const;

type Doc = {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
  shipment_id: string;
  shipments: { reference: string; clients: { name: string } | null } | null;
};

function DocumentsPage() {
  const [q, setQ] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const { data } = useQuery({
    queryKey: ["all-documents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select(
          "id, name, category, created_at, shipment_id, shipments(reference, clients(name))",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []) as unknown as Doc[];
    },
  });

  const needle = q.trim().toLowerCase();
  const matches = (d: Doc) =>
    !needle ||
    d.name.toLowerCase().includes(needle) ||
    (d.category ?? "").toLowerCase().includes(needle) ||
    (d.shipments?.reference ?? "").toLowerCase().includes(needle) ||
    (d.shipments?.clients?.name ?? "").toLowerCase().includes(needle);

  const docs = (data ?? []).filter(matches);

  // Regroupement par dossier.
  const groups = new Map<
    string,
    { id: string; ref: string; client: string; docs: Doc[] }
  >();
  for (const d of docs) {
    const key = d.shipment_id ?? "none";
    if (!groups.has(key)) {
      groups.set(key, {
        id: d.shipment_id,
        ref: d.shipments?.reference ?? "Dossier inconnu",
        client: d.shipments?.clients?.name ?? "—",
        docs: [],
      });
    }
    groups.get(key)!.docs.push(d);
  }
  const grouped = Array.from(groups.values());

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-5 md:p-8">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
          Archives
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight" style={sora}>
          Documents
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {docs.length} document{docs.length > 1 ? "s" : ""} ·{" "}
          {grouped.length} dossier{grouped.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Recherche */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2.5 shadow-sm">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un document, un dossier ou un client…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Effacer
          </button>
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center text-sm text-muted-foreground">
          {needle
            ? "Aucun document ne correspond à votre recherche."
            : "Aucun document n'a été téléversé."}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => {
            // Ouvert si l'utilisateur l'a déplié, ou automatiquement en recherche.
            const open = needle ? true : openIds.has(g.id);
            return (
              <div
                key={g.id}
                className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
              >
                {/* En-tête du dossier (repliable) */}
                <div
                  className={`flex items-center gap-2 bg-muted/30 px-4 py-3 ${
                    open ? "border-b border-border" : ""
                  }`}
                >
                  <button
                    onClick={() => toggle(g.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <ChevronRight
                      className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                        open ? "rotate-90" : ""
                      }`}
                    />
                    <FolderKanban className="size-5 shrink-0 text-hero-blue" />
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-bold">{g.ref}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {g.client}
                      </div>
                    </div>
                  </button>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-muted-foreground shadow-sm">
                    {g.docs.length} doc{g.docs.length > 1 ? "s" : ""}
                  </span>
                  <Link
                    to="/dossiers/$id"
                    params={{ id: g.id }}
                    title="Ouvrir le dossier"
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-white hover:text-hero-blue"
                  >
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>

                {/* Documents (masqués tant que replié) */}
                {open && (
                  <ul className="divide-y divide-border">
                    {g.docs.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-3 px-5 py-3 text-sm"
                      >
                        <FileText className="size-4 shrink-0 text-foreground/40" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {d.name}
                        </span>
                        {d.category && (
                          <span className="hidden rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline">
                            {d.category}
                          </span>
                        )}
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {new Date(d.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
