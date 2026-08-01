import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { clientPortalData, clientPortalDocUrl } from "@/lib/portal.functions";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  statusProgress,
  statusTone,
  type ShipmentStatus,
} from "@/lib/status";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Download,
  FileText,
  MessageSquare,
  Ship,
} from "lucide-react";
import logoAsset from "@/assets/newlogo.png";

export const Route = createFileRoute("/suivi/$token")({
  ssr: false,
  component: SuiviPage,
});

const sora = { fontFamily: "var(--font-label)" } as const;
const TONE: Record<
  ReturnType<typeof statusTone>,
  { bar: string; track: string; pill: string; dot: string }
> = {
  done: { bar: "bg-emerald-500", track: "bg-emerald-100", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  progress: { bar: "bg-blue-500", track: "bg-blue-100", pill: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  blocked: { bar: "bg-amber-500", track: "bg-amber-100", pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  neutral: { bar: "bg-slate-400", track: "bg-slate-100", pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};

type Dossier = {
  id: string;
  reference: string;
  status: string;
  arrival_date: string | null;
  vessel_name: string | null;
  shipping_company: string | null;
  bl_number: string | null;
  container_number: string | null;
  origin_country: string | null;
  origin_port: string | null;
  goods_description: string | null;
  free_time_end: string | null;
  storage_free_end: string | null;
  documents: { id: string; name: string; category: string | null }[];
  comments: { id: string; body: string; created_at: string }[];
};

function SuiviPage() {
  const { token } = Route.useParams();
  const fn = useServerFn(clientPortalData);
  const docUrlFn = useServerFn(clientPortalDocUrl);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["suivi", token],
    queryFn: () => fn({ data: { token } }),
    retry: false,
  });

  const download = async (docId: string) => {
    try {
      const { url } = await docUrlFn({ data: { token, docId } });
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Téléchargement impossible");
    }
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f4f6fb] text-foreground">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          <img src={logoAsset} alt="ORUS TRANSIT" className="h-9 w-auto object-contain" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Suivi de dossier
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : error || !data ? (
          <div className="rounded-2xl border border-border bg-white p-10 text-center shadow-sm">
            <h1 className="text-lg font-extrabold" style={sora}>
              Lien de suivi invalide
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ce lien n'est plus valide. Demandez à votre transitaire de vous
              renvoyer votre lien de suivi.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold tracking-tight" style={sora}>
                Bonjour {data.clientName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Suivi de vos dossiers de dédouanement, gérés par{" "}
                <strong className="text-foreground">{data.cabinetName}</strong>.
              </p>
            </div>

            {(data.dossiers as Dossier[]).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center text-sm text-muted-foreground">
                Aucun dossier pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {(data.dossiers as Dossier[]).map((d) => {
                  const st = d.status as ShipmentStatus;
                  const tone = TONE[statusTone(st)];
                  const step = STATUS_ORDER.indexOf(st) + 1;
                  const open = openId === d.id;
                  const deadline = d.free_time_end || d.storage_free_end;
                  let sur: number | null = null;
                  if (deadline) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    sur = Math.round(
                      (new Date(deadline).getTime() - today.getTime()) / 86400000,
                    );
                  }
                  return (
                    <div
                      key={d.id}
                      className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
                    >
                      <button
                        onClick={() => setOpenId(open ? null : d.id)}
                        className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-primary/5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold">{d.reference}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.pill}`}>
                              {STATUS_LABEL[st]}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Ship className="size-3.5" /> {d.vessel_name || "—"}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="size-3.5" />
                              {d.arrival_date
                                ? new Date(d.arrival_date).toLocaleDateString("fr-FR")
                                : "date à confirmer"}
                            </span>
                            {sur != null && sur <= 10 && (
                              <span className={`inline-flex items-center gap-1 font-semibold ${sur < 0 ? "text-red-600" : "text-amber-600"}`}>
                                <Clock className="size-3.5" />
                                {sur < 0 ? `surestaries +${-sur}j` : `surestaries J-${sur}`}
                              </span>
                            )}
                          </div>
                          <div className="mt-2.5 flex items-center gap-2">
                            <div className={`h-1.5 w-full overflow-hidden rounded-full ${tone.track}`}>
                              <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${statusProgress(st)}%` }} />
                            </div>
                            <span className="shrink-0 font-mono text-[11px] font-semibold text-muted-foreground">
                              {step}/12
                            </span>
                          </div>
                        </div>
                        <ChevronRight className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
                      </button>

                      {open && (
                        <div className="space-y-5 border-t border-border p-4">
                          {sur != null && sur <= 10 && (
                            <div className={`rounded-xl border p-3 text-xs ${sur < 0 ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                              {sur < 0
                                ? `Surestaries dépassées de ${-sur} jour${-sur > 1 ? "s" : ""} (échéance ${new Date(deadline!).toLocaleDateString("fr-FR")}). Des frais peuvent s'appliquer.`
                                : `Surestaries dans ${sur} jour${sur > 1 ? "s" : ""} (échéance ${new Date(deadline!).toLocaleDateString("fr-FR")}). Anticipez l'enlèvement.`}
                            </div>
                          )}

                          {/* Pipeline */}
                          <div>
                            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              Avancement
                            </h3>
                            <ol className="grid gap-1.5 sm:grid-cols-2">
                              {STATUS_ORDER.map((s, i) => {
                                const cur = STATUS_ORDER.indexOf(st);
                                const state = i < cur ? "done" : i === cur ? "current" : "todo";
                                return (
                                  <li key={s} className="flex items-center gap-2 text-sm">
                                    {state === "done" ? (
                                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                                    ) : state === "current" ? (
                                      <span className="grid size-4 shrink-0 place-items-center">
                                        <span className="size-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_1px_rgba(59,130,246,0.6)]" />
                                      </span>
                                    ) : (
                                      <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                                    )}
                                    <span className={state === "todo" ? "text-muted-foreground" : state === "current" ? "font-semibold" : ""}>
                                      {STATUS_LABEL[s]}
                                    </span>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>

                          {/* Infos */}
                          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                            {[
                              ["Connaissement (BL)", d.bl_number],
                              ["Conteneur", d.container_number],
                              ["Origine", [d.origin_port, d.origin_country].filter(Boolean).join(", ") || null],
                              ["Marchandise", d.goods_description],
                            ]
                              .filter(([, v]) => v)
                              .map(([label, v]) => (
                                <div key={label as string}>
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    {label}
                                  </div>
                                  <div className="mt-0.5 text-sm">{v}</div>
                                </div>
                              ))}
                          </div>

                          {/* Documents */}
                          <div>
                            <h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              <FileText className="size-3.5" /> Documents ({d.documents.length})
                            </h3>
                            {d.documents.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Aucun document partagé.</p>
                            ) : (
                              <ul className="divide-y divide-border rounded-xl border border-border">
                                {d.documents.map((doc) => (
                                  <li key={doc.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                                    <FileText className="size-4 shrink-0 text-foreground/40" />
                                    <span className="min-w-0 flex-1 truncate">{doc.name}</span>
                                    <button
                                      onClick={() => download(doc.id)}
                                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-black/5 hover:text-hero-blue"
                                      title="Télécharger"
                                    >
                                      <Download className="size-4" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Messages */}
                          {d.comments.length > 0 && (
                            <div>
                              <h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                <MessageSquare className="size-3.5" /> Messages
                              </h3>
                              <ul className="space-y-2">
                                {d.comments.map((c) => (
                                  <li key={c.id} className="rounded-xl border border-border bg-muted/30 px-3 py-2">
                                    <div className="text-sm">{c.body}</div>
                                    <div className="mt-1 text-[10px] text-muted-foreground">
                                      {new Date(c.created_at).toLocaleString("fr-FR")}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="mt-8 text-center text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} ORUS TRANSIT · Suivi sécurisé de vos dossiers.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
