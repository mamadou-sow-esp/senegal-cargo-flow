import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendSms } from "@/lib/sms.functions";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  priorityTone,
  statusTone,
  type ShipmentStatus,
} from "@/lib/status";
import {
  Anchor,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  Eye,
  MessageSquare,
  Phone,
  Plus,
  Printer,
  Send,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dossiers/$id")({
  component: DossierDetail,
});

// Police d'affichage Sora + pastille d'état « glowy ».
const sora = { fontFamily: "var(--font-label)" } as const;
const STATUS_DOT: Record<ReturnType<typeof statusTone>, string> = {
  done: "bg-emerald-500 shadow-[0_0_12px_1px_rgba(16,185,129,0.65)]",
  progress: "bg-blue-500 shadow-[0_0_12px_1px_rgba(59,130,246,0.65)]",
  blocked: "bg-amber-500 shadow-[0_0_12px_1px_rgba(245,158,11,0.7)]",
  neutral: "bg-slate-400 shadow-[0_0_10px_1px_rgba(148,163,184,0.55)]",
};

type Shipment = {
  id: string;
  company_id: string;
  reference: string;
  vessel_name: string | null;
  shipping_company: string | null;
  bl_number: string | null;
  container_number: string | null;
  origin_country: string | null;
  origin_port: string | null;
  arrival_date: string | null;
  goods_description: string | null;
  goods_value: number | null;
  customs_regime: string | null;
  free_time_end: string | null;
  storage_free_end: string | null;
  carrier_steps: Record<string, boolean> | null;
  status: ShipmentStatus;
  priority: "basse" | "standard" | "haute" | "critique";
  notes: string | null;
  created_at: string;
  clients: { name: string; phone: string | null } | null;
};

function DossierDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: shipment } = useQuery({
    queryKey: ["shipment", id],
    queryFn: async (): Promise<Shipment> => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*, clients(name, phone)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Shipment;
    },
  });

  const { data: docs } = useQuery({
    queryKey: ["docs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("shipment_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("shipment_id", id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async (s: ShipmentStatus) => {
      const { error } = await supabase
        .from("shipments")
        .update({ status: s })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipment", id] });
      toast.success("Étape mise à jour");
    },
  });

  if (!shipment) {
    return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-8">
      <Link
        to="/dossiers"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Retour aux dossiers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className="font-mono text-xl font-extrabold text-primary"
              style={sora}
            >
              {shipment.reference}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityTone(shipment.priority)}`}
            >
              {shipment.priority}
            </span>
          </div>
          <h1
            className="mt-1.5 text-2xl font-extrabold tracking-tight"
            style={sora}
          >
            {shipment.clients?.name || "Client non renseigné"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {shipment.vessel_name || "Navire ?"} ·{" "}
            {shipment.shipping_company || "Compagnie ?"} · BL{" "}
            <span className="font-mono">{shipment.bl_number || "—"}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
          <span
            className={`size-3 shrink-0 rounded-full ${STATUS_DOT[statusTone(shipment.status)]}`}
          />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Statut actuel
            </div>
            <div className="mt-0.5 text-sm font-semibold">
              {STATUS_LABEL[shipment.status]}
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Pipeline de dédouanement
        </h2>
        <ol className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {STATUS_ORDER.map((s, i) => {
            const currIdx = STATUS_ORDER.indexOf(shipment.status);
            const state =
              i < currIdx ? "done" : i === currIdx ? "current" : "todo";
            return (
              <li key={s}>
                <button
                  onClick={() => setStatus.mutate(s)}
                  className={`flex w-full items-center gap-3 rounded border px-3 py-2 text-left text-xs transition-colors ${
                    state === "current"
                      ? "border-accent bg-accent/5 font-semibold text-accent"
                      : state === "done"
                        ? "border-border bg-muted/50 text-muted-foreground line-through"
                        : "border-border bg-white text-foreground hover:bg-muted"
                  }`}
                >
                  {state === "done" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle
                      className={`size-4 shrink-0 ${state === "current" ? "text-accent" : "text-muted-foreground"}`}
                    />
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{STATUS_LABEL[s]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <CarrierCircuitPanel id={id} steps={shipment.carrier_steps} />
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <DeadlinesPanel
          id={id}
          freeTimeEnd={shipment.free_time_end}
          storageEnd={shipment.storage_free_end}
          onChange={() => qc.invalidateQueries({ queryKey: ["shipment", id] })}
        />
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <ChecklistPanel
          regime={shipment.customs_regime}
          goods={shipment.goods_description}
          docs={docs ?? []}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm lg:col-span-2">
          <DocumentsPanel
            shipmentId={id}
            companyId={shipment.company_id}
            docs={docs ?? []}
            onChange={() => qc.invalidateQueries({ queryKey: ["docs", id] })}
          />
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <CommentsPanel
            shipmentId={id}
            comments={comments ?? []}
            onChange={() =>
              qc.invalidateQueries({ queryKey: ["comments", id] })
            }
          />
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <DisbursementsPanel
          shipmentId={id}
          companyId={shipment.company_id}
          clientName={shipment.clients?.name ?? null}
          reference={shipment.reference}
        />
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <SmsPanel
          shipmentId={id}
          reference={shipment.reference}
          clientPhone={shipment.clients?.phone ?? null}
        />
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Informations générales
        </h2>
        <dl className="grid gap-4 text-sm md:grid-cols-3">
          <Info label="Conteneur / Châssis" value={shipment.container_number} mono />
          <Info label="Pays d'origine" value={shipment.origin_country} />
          <Info label="Port d'origine" value={shipment.origin_port} />
          <Info
            label="Date d'arrivée"
            value={
              shipment.arrival_date
                ? new Date(shipment.arrival_date).toLocaleDateString("fr-FR")
                : null
            }
          />
          <Info label="Régime douanier" value={shipment.customs_regime} />
          <Info
            label="Valeur"
            value={
              shipment.goods_value
                ? `${shipment.goods_value.toLocaleString("fr-FR")} FCFA`
                : null
            }
          />
          <Info
            label="Marchandises"
            value={shipment.goods_description}
            wide
          />
          <Info label="Notes" value={shipment.notes} wide />
        </dl>
      </section>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
  wide,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-3" : ""}>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1 ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

// ── Notifications SMS (Africa's Talking) ─────────────────────────────
// Met le numéro au format E.164 attendu par Africa's Talking (sans espaces).
function normalizePhone(raw: string): string {
  let s = raw.replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!s.startsWith("+")) {
    if (s.startsWith("221")) s = "+" + s;
    else s = "+221" + s.replace(/^0/, "");
  }
  return s;
}

function SmsPanel({
  shipmentId,
  reference,
  clientPhone,
}: {
  shipmentId: string;
  reference: string;
  clientPhone: string | null;
}) {
  const qc = useQueryClient();
  const sendFn = useServerFn(sendSms);
  const sb = supabase as unknown as { from: (t: string) => any };
  const [to, setTo] = useState(clientPhone ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { data: log } = useQuery({
    queryKey: ["sms", shipmentId],
    queryFn: async () => {
      const { data } = await sb
        .from("sms_log")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Array<{
        id: string;
        recipient: string;
        message: string;
        status: string;
        created_at: string;
      }>;
    },
  });
  const rows = log ?? [];

  const templates = [
    {
      label: "Conteneur arrive",
      text: `Bonjour, votre conteneur pour le dossier ${reference} est arrive au Port de Dakar. ORUS TRANSIT.`,
    },
    {
      label: "BAE disponible",
      text: `Bonjour, le Bon a Enlever (BAE) de votre dossier ${reference} est disponible. ORUS TRANSIT.`,
    },
    {
      label: "Document manquant",
      text: `Bonjour, un document est manquant pour votre dossier ${reference}. Merci de nous contacter. ORUS TRANSIT.`,
    },
  ];

  const send = async () => {
    if (!to.trim() || !message.trim()) {
      toast.error("Numéro et message requis");
      return;
    }
    setSending(true);
    try {
      await sendFn({
        data: {
          to: normalizePhone(to),
          message: message.trim(),
          shipmentId,
        },
      });
      toast.success("SMS envoyé");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["sms", shipmentId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <Phone className="size-3.5" /> Notifier le client par SMS
      </h2>

      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="+221 7X XXX XX XX"
          className="rounded border border-input bg-white px-3 py-2 text-sm outline-none focus:border-hero-blue"
        />
        <div className="flex flex-wrap gap-1.5">
          {templates.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setMessage(t.text)}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-hero-blue hover:text-hero-blue"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Votre message… (ou choisissez un modèle ci-dessus)"
        className="mt-3 w-full rounded border border-input bg-white px-3 py-2 text-sm outline-none focus:border-hero-blue"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {message.length} caractères ·{" "}
          {Math.max(1, Math.ceil(message.length / 160))} SMS
        </span>
        <button
          onClick={send}
          disabled={sending || !to.trim() || !message.trim()}
          className="inline-flex items-center gap-1.5 rounded bg-hero-blue px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50"
        >
          <Send className="size-3.5" /> {sending ? "Envoi…" : "Envoyer"}
        </button>
      </div>

      {rows.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-3">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-2 text-xs">
              <span
                className={`mt-0.5 size-1.5 shrink-0 rounded-full ${
                  r.status === "sent" ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-foreground/80">{r.message}</div>
                <div className="text-[10px] text-muted-foreground">
                  {r.recipient} ·{" "}
                  {new Date(r.created_at).toLocaleString("fr-FR")} ·{" "}
                  {r.status === "sent" ? "Envoyé" : "Échec"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[10px] text-muted-foreground">
        SMS envoyés via Africa's Talking. Plan Pro — 100 SMS/mois inclus.
      </p>
    </div>
  );
}

// ── Circuit compagnie / consignataire (obtention du BAD) ─────────────
const CARRIER_STEPS = [
  { key: "consignataire", label: "Consignataire contacté · BL enregistré au port" },
  { key: "bl_endosse", label: "Connaissement (BL) endossé et remis" },
  { key: "frais_compagnie", label: "Frais compagnie réglés (fret, THC, dossier)" },
  { key: "caution_deposee", label: "Caution conteneur déposée" },
  { key: "bad_obtenu", label: "Bon à Délivrer (BAD) obtenu" },
  { key: "visa_pad", label: "Visa PAD (Port Autonome) obtenu" },
  { key: "conteneur_restitue", label: "Conteneur vide restitué" },
  { key: "caution_recuperee", label: "Caution récupérée" },
];

function CarrierCircuitPanel({
  id,
  steps,
}: {
  id: string;
  steps: Record<string, boolean> | null;
}) {
  const sb = supabase as unknown as { from: (t: string) => any };
  const [local, setLocal] = useState<Record<string, boolean>>(steps ?? {});

  const toggle = async (key: string) => {
    const next = { ...local, [key]: !local[key] };
    setLocal(next);
    const { error } = await sb
      .from("shipments")
      .update({ carrier_steps: next })
      .eq("id", id);
    if (error) toast.error(error.message);
  };

  const done = CARRIER_STEPS.filter((s) => local[s.key]).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Anchor className="size-3.5" /> Circuit compagnie · consignataire
        </h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            done === CARRIER_STEPS.length
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {done}/{CARRIER_STEPS.length}
        </span>
      </div>
      <ol className="space-y-1.5">
        {CARRIER_STEPS.map((s, i) => {
          const ok = !!local[s.key];
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => toggle(s.key)}
                className={`flex w-full items-center gap-3 rounded border px-3 py-2 text-left text-sm transition ${
                  ok
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-border bg-white hover:bg-muted/40"
                }`}
              >
                {ok ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground/50" />
                )}
                <span className="font-mono text-[10px] text-muted-foreground">
                  {i + 1}
                </span>
                <span className="flex-1">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[10px] text-muted-foreground">
        Circuit parallèle à la douane : sans le Bon à Délivrer (BAD) de la
        compagnie, le conteneur ne sort pas, même avec le Bon à Enlever douane.
      </p>
    </div>
  );
}

// ── Échéances : surestaries & magasinage ────────────────────────────
function DeadlinesPanel({
  id,
  freeTimeEnd,
  storageEnd,
  onChange,
}: {
  id: string;
  freeTimeEnd: string | null;
  storageEnd: string | null;
  onChange: () => void;
}) {
  const sb = supabase as unknown as { from: (t: string) => any };
  const save = async (field: string, value: string) => {
    const { error } = await sb
      .from("shipments")
      .update({ [field]: value || null })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Échéance mise à jour");
    onChange();
  };
  return (
    <div>
      <h2 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Échéances · surestaries &amp; magasinage
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <DeadlineCard
          label="Fin de franchise conteneur"
          hint="Surestaries compagnie maritime"
          value={freeTimeEnd}
          onSave={(v) => save("free_time_end", v)}
        />
        <DeadlineCard
          label="Fin de franchise magasinage"
          hint="Frais de stockage au port"
          value={storageEnd}
          onSave={(v) => save("storage_free_end", v)}
        />
      </div>
    </div>
  );
}

function DeadlineCard({
  label,
  hint,
  value,
  onSave,
}: {
  label: string;
  hint: string;
  value: string | null;
  onSave: (v: string) => void;
}) {
  const days = value
    ? Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000)
    : null;
  const tone =
    days == null ? "neutral" : days < 0 ? "red" : days <= 3 ? "amber" : "green";
  const box: Record<string, string> = {
    neutral: "border-border bg-muted/30",
    green: "border-emerald-200 bg-emerald-50/60",
    amber: "border-amber-200 bg-amber-50/60",
    red: "border-red-200 bg-red-50/60",
  };
  const txt: Record<string, string> = {
    neutral: "text-muted-foreground",
    green: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  const badge =
    days == null
      ? ""
      : days < 0
        ? `Dépassé de ${Math.abs(days)} j`
        : days === 0
          ? "Échéance aujourd'hui"
          : `J-${days}`;
  return (
    <div className={`rounded border p-4 ${box[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        {value && (
          <span className={`text-xs font-bold ${txt[tone]}`}>{badge}</span>
        )}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>
      <input
        type="date"
        defaultValue={value ?? ""}
        onChange={(e) => onSave(e.target.value)}
        className="mt-2 w-full rounded border border-input bg-white px-2 py-1.5 text-sm"
      />
    </div>
  );
}

// ── Checklist documentaire par régime douanier ──────────────────────
const REGIME_PROFILES: {
  match: string[];
  label: string;
  required: string[];
}[] = [
  {
    match: ["admission temporaire", "im5"],
    label: "Admission temporaire",
    required: [
      "Connaissement",
      "Facture commerciale",
      "Packing List",
      "BESC",
      "Acte de caution / soumission",
    ],
  },
  {
    match: ["transit", "im8"],
    label: "Transit",
    required: [
      "Connaissement",
      "Facture commerciale",
      "BESC",
      "Déclaration de transit",
      "Caution de transit",
    ],
  },
  {
    match: ["entrep", "im7"],
    label: "Entrepôt",
    required: [
      "Connaissement",
      "Facture commerciale",
      "Packing List",
      "BESC",
      "Autorisation d'entrepôt",
    ],
  },
];

const DEFAULT_REGIME = {
  label: "Mise à la consommation",
  required: [
    "Connaissement",
    "Facture commerciale",
    "Packing List",
    "BESC",
    "Certificat d'origine",
  ],
};

// Profil spécifique aux imports de véhicules (RoRo).
const VEHICLE_PROFILE = {
  label: "Véhicule (import)",
  required: [
    "Connaissement",
    "Facture commerciale",
    "BESC",
    "Certificat d'immatriculation",
  ],
};

function ChecklistPanel({
  regime,
  goods,
  docs,
}: {
  regime: string | null;
  goods: string | null;
  docs: Array<{ category: string | null }>;
}) {
  const r = (regime ?? "").toLowerCase();
  const isVehicle = /v[eé]hicule|voiture|ch[aâ]ssis|roro/i.test(
    `${regime ?? ""} ${goods ?? ""}`,
  );
  const profile = isVehicle
    ? VEHICLE_PROFILE
    : (REGIME_PROFILES.find((p) => p.match.some((m) => r.includes(m))) ??
      DEFAULT_REGIME);
  const have = new Set(
    docs.map((d) => (d.category ?? "").trim().toLowerCase()),
  );
  const items = profile.required.map((name) => ({
    name,
    ok: have.has(name.toLowerCase()),
  }));
  const done = items.filter((i) => i.ok).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Pièces requises · {profile.label}
        </h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            done === items.length
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {done}/{items.length} fournies
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((i) => (
          <li
            key={i.name}
            className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${
              i.ok
                ? "border-emerald-200 bg-emerald-50/50 text-foreground"
                : "border-amber-200 bg-amber-50/40 text-foreground"
            }`}
          >
            {i.ok ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="size-4 shrink-0 text-amber-500" />
            )}
            <span className="flex-1">{i.name}</span>
            {!i.ok && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                Manquant
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[10px] text-muted-foreground">
        Liste indicative selon le régime déclaré. Les pièces sont cochées
        automatiquement quand un document de la catégorie correspondante est
        téléversé.
      </p>
    </div>
  );
}

type Disb = {
  id: string;
  label: string;
  category: string | null;
  amount: number;
  billable: boolean;
  created_at: string;
};

const DISB_CATEGORIES = [
  "Droits de douane",
  "Surestaries",
  "Magasinage",
  "Manutention",
  "Transport",
  "Honoraires",
  "Autres",
];

function DisbursementsPanel({
  shipmentId,
  companyId,
  clientName,
  reference,
}: {
  shipmentId: string;
  companyId: string;
  clientName: string | null;
  reference: string;
}) {
  const qc = useQueryClient();
  // Table récente : les types Supabase générés ne la connaissent pas encore.
  const sb = supabase as unknown as { from: (t: string) => any };

  const [label, setLabel] = useState("");
  const [category, setCategory] = useState(DISB_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [billable, setBillable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDecompte, setShowDecompte] = useState(false);

  const { data } = useQuery({
    queryKey: ["disbursements", shipmentId],
    queryFn: async () => {
      const { data } = await sb
        .from("disbursements")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: true });
      return (data ?? []) as Disb[];
    },
  });
  const rows = data ?? [];
  const totalAll = rows.reduce((a, r) => a + Number(r.amount || 0), 0);
  const totalBill = rows
    .filter((r) => r.billable)
    .reduce((a, r) => a + Number(r.amount || 0), 0);

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["disbursements", shipmentId] });
  const fmt = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!label.trim() || !amt) {
      toast.error("Libellé et montant requis");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await sb.from("disbursements").insert({
      shipment_id: shipmentId,
      company_id: companyId,
      label: label.trim(),
      category,
      amount: amt,
      billable,
      created_by: u.user?.id,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLabel("");
    setAmount("");
    setBillable(true);
    toast.success("Débours ajouté");
    refresh();
  };

  const del = async (id: string) => {
    await sb.from("disbursements").delete().eq("id", id);
    toast.success("Supprimé");
    refresh();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Wallet className="size-3.5" /> Débours &amp; facturation
        </h2>
        <button
          onClick={() => setShowDecompte(true)}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-1.5 rounded bg-hero-blue px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-40"
        >
          <Printer className="size-3.5" /> Décompte client
        </button>
      </div>

      <form
        onSubmit={add}
        className="grid gap-2 sm:grid-cols-[1fr_150px_130px_auto]"
      >
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé (ex : Surestaries 3 jours)"
          className="rounded border border-input bg-white px-3 py-2 text-sm outline-none focus:border-hero-blue"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-input bg-white px-2 py-2 text-sm"
        >
          {DISB_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Montant"
          className="rounded border border-input bg-white px-3 py-2 text-sm outline-none focus:border-hero-blue"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-1 rounded bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="size-3.5" /> Ajouter
        </button>
      </form>
      <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={billable}
          onChange={(e) => setBillable(e.target.checked)}
        />
        Refacturable au client
      </label>

      <div className="mt-4">
        {rows.length === 0 ? (
          <div className="rounded border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
            Aucun débours. Ajoutez les frais avancés (droits, surestaries,
            magasinage…).
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.label}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {r.category || "—"}
                    {!r.billable && " · non refacturable"}
                  </div>
                </div>
                <div className="font-mono text-sm tabular-nums">
                  {fmt(Number(r.amount))}
                </div>
                <button
                  onClick={() => del(r.id)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  title="Supprimer"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
          <div className="rounded bg-muted/50 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Total avancé
            </div>
            <div className="mt-1 font-mono text-lg font-bold">{fmt(totalAll)}</div>
          </div>
          <div className="rounded bg-hero-blue/10 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
              À facturer au client
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-hero-blue">
              {fmt(totalBill)}
            </div>
          </div>
        </div>
      )}

      {showDecompte && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowDecompte(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="text-sm font-semibold">Décompte client</div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => window.print()}
                  className="rounded p-1.5 text-muted-foreground hover:bg-black/5"
                  title="Imprimer"
                >
                  <Printer className="size-4" />
                </button>
                <button
                  onClick={() => setShowDecompte(false)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-black/5"
                  title="Fermer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="overflow-auto p-5">
              <div className="text-lg font-extrabold tracking-tight">
                {clientName || "Client"}
              </div>
              <div className="text-xs text-muted-foreground">
                Dossier {reference}
              </div>
              <table className="mt-4 w-full text-sm">
                <tbody className="divide-y divide-border">
                  {rows
                    .filter((r) => r.billable)
                    .map((r) => (
                      <tr key={r.id}>
                        <td className="py-2">
                          {r.label}
                          <div className="text-[10px] text-muted-foreground">
                            {r.category || ""}
                          </div>
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums">
                          {fmt(Number(r.amount))}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center justify-between border-t-2 border-foreground/80 pt-3">
                <span className="text-sm font-bold uppercase tracking-wide">
                  Total à payer
                </span>
                <span className="font-mono text-lg font-extrabold">
                  {fmt(totalBill)}
                </span>
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground">
                Montants indicatifs — document généré par ORUS TRANSIT.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentsPanel({
  shipmentId,
  companyId,
  docs,
  onChange,
}: {
  shipmentId: string;
  companyId: string;
  docs: Array<{
    id: string;
    name: string;
    category: string | null;
    storage_path: string;
    is_client_visible: boolean;
    created_at: string;
  }>;
  onChange: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("Facture commerciale");
  const [preview, setPreview] = useState<{
    url: string;
    name: string;
    kind: "pdf" | "image" | "other";
  } | null>(null);

  const kindOf = (name: string): "pdf" | "image" | "other" => {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf") return "pdf";
    if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext))
      return "image";
    return "other";
  };

  const handlePreview = async (path: string, name: string) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 300);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPreview({ url: data.signedUrl, name, kind: kindOf(name) });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const path = `${companyId}/${shipmentId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("documents").insert({
        shipment_id: shipmentId,
        company_id: companyId,
        name: file.name,
        category,
        storage_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: u.user?.id,
      });
      if (error) throw error;
      toast.success("Document ajouté");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (path: string, name: string) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 60);
    if (error) {
      toast.error(error.message);
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.click();
  };

  const handleDelete = async (id: string, path: string) => {
    await supabase.storage.from("documents").remove([path]);
    await supabase.from("documents").delete().eq("id", id);
    toast.success("Document supprimé");
    onChange();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Documents ({docs.length})
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-border bg-white px-2 py-1 text-xs"
          >
            {[
              "Facture commerciale",
              "Packing List",
              "Connaissement",
              "BESC",
              "Certificat d'origine",
              "Certificat d'immatriculation",
              "Certificat sanitaire",
              "Quitus",
              "Autres",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90">
            <Upload className="size-3.5" />
            {uploading ? "…" : "Téléverser"}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="rounded border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
          Aucun document. Téléversez PDF, image, Excel, Word.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-3">
              <div className="grid size-8 place-items-center rounded bg-muted text-[10px] font-mono font-bold">
                DOC
              </div>
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => handlePreview(d.storage_path, d.name)}
                  className="block max-w-full truncate text-left text-sm font-medium hover:text-hero-blue hover:underline"
                  title="Aperçu"
                >
                  {d.name}
                </button>
                <div className="text-[10px] text-muted-foreground">
                  {d.category || "Non catégorisé"} ·{" "}
                  {new Date(d.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <button
                onClick={() => handlePreview(d.storage_path, d.name)}
                className="rounded p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground"
                title="Aperçu"
              >
                <Eye className="size-4" />
              </button>
              <button
                onClick={() => handleDownload(d.storage_path, d.name)}
                className="rounded p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground"
                title="Télécharger"
              >
                <Download className="size-4" />
              </button>
              <button
                onClick={() => handleDelete(d.id, d.storage_path)}
                className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                title="Supprimer"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{preview.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Aperçu du document
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground"
                  title="Ouvrir dans un onglet"
                >
                  <Download className="size-4" />
                </a>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground"
                  title="Fermer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-muted/30">
              {preview.kind === "pdf" ? (
                <iframe
                  src={preview.url}
                  title={preview.name}
                  className="h-full w-full"
                />
              ) : preview.kind === "image" ? (
                <div className="flex h-full items-center justify-center p-4">
                  <img
                    src={preview.url}
                    alt={preview.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Aperçu non disponible pour ce type de fichier.
                  </p>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90"
                  >
                    <Download className="size-3.5" /> Télécharger le fichier
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentsPanel({
  shipmentId,
  comments,
  onChange,
}: {
  shipmentId: string;
  comments: Array<{
    id: string;
    body: string;
    is_public: boolean;
    author_id: string;
    created_at: string;
  }>;
  onChange: () => void;
}) {
  const [body, setBody] = useState("");
  const [isPublic, setPublic] = useState(false);

  const send = async () => {
    if (!body.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("comments").insert({
      shipment_id: shipmentId,
      body: body.trim(),
      is_public: isPublic,
      author_id: u.user!.id,
    });
    if (error) toast.error(error.message);
    else {
      setBody("");
      onChange();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <MessageSquare className="size-3.5" /> Fil de discussion
      </h2>
      <div className="flex-1 space-y-3 overflow-auto">
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Aucun commentaire pour l'instant.
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="rounded bg-muted/50 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {new Date(c.created_at).toLocaleString("fr-FR")}
              </span>
              {c.is_public && (
                <span className="rounded bg-emerald-100 px-1.5 text-[9px] font-bold uppercase text-emerald-700">
                  Public
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-xs">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ajouter un commentaire…"
          className="w-full rounded border border-input bg-white px-3 py-2 text-xs"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setPublic(e.target.checked)}
            />
            Visible client
          </label>
          <button
            onClick={send}
            className="rounded bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
