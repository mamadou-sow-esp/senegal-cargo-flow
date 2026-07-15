import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const { data } = useQuery({
    queryKey: ["all-documents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, name, category, created_at, shipment_id, shipments(reference)")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Archives
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          Tous les documents
        </h1>
      </div>
      <div className="overflow-hidden rounded border border-border bg-white">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <Th>Fichier</Th>
              <Th>Catégorie</Th>
              <Th>Dossier</Th>
              <Th className="text-right">Ajouté le</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {(data ?? []).map((d) => (
              <tr key={d.id} className="hover:bg-primary/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="font-medium">{d.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {d.category || "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to="/dossiers/$id"
                    params={{ id: d.shipment_id }}
                    className="font-mono text-xs text-primary underline underline-offset-2"
                  >
                    {d.shipments?.reference || "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-mono text-[11px] text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  Aucun document n'a été téléversé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${className}`}>
      {children}
    </th>
  );
}
