import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(8000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(30),
});

const SYSTEM_PROMPT = `Tu es « TransitORUS », l'assistant expert des commissionnaires en douane (transitaires) au Sénégal, intégré à leur logiciel ORUS TRANSIT.

Tu as accès aux DONNÉES RÉELLES du cabinet (dossiers, clients, employés, statuts, échéances de surestaries) fournies dans le message de contexte. Utilise-les pour produire des résumés, des états de situation et des recommandations concrètes : dossiers en retard, surestaries à surveiller, priorités du jour, charge par statut. Si une information n'est pas dans le contexte, dis-le simplement au lieu d'inventer.

Ton rôle :
- Aider à gérer les dossiers de dédouanement à l'importation.
- Expliquer les procédures GAINDE / COTECNA / Douanes sénégalaises, les documents requis (BL, facture commerciale, packing list, certificat d'origine, DPI, BAE, quittance, etc.), les incoterms, les régimes douaniers et le calcul indicatif des droits & taxes (DD, TVA 18%, PCS, PC, RS).

FORMAT DE RÉPONSE (respecte-le strictement, sois lisible) :
- Écris en français, en phrases courtes.
- Pour toute liste, utilise UNIQUEMENT des puces commençant par un tiret « - ». N'utilise JAMAIS « + » ni « * » comme puce.
- Emploie le gras (**texte**) avec parcimonie, seulement pour un intitulé de section ou un chiffre clé.
- Pas de tableaux ni de titres markdown à dièses.
- Rappelle que les montants et délais sont indicatifs et à vérifier auprès de l'Administration des douanes.`;

// Libellés lisibles des statuts de dossier.
const STATUS_FR: Record<string, string> = {
  cree: "Créé",
  documents_attente: "Documents en attente",
  documents_complets: "Documents complets",
  declaration_preparee: "Déclaration préparée",
  declaration_deposee: "Déclaration déposée",
  attente_validation: "Attente de validation",
  controle_documentaire: "Contrôle documentaire",
  controle_physique: "Contrôle physique",
  paiement_droits: "Paiement des droits",
  bon_a_enlever: "Bon à Enlever",
  marchandise_sortie: "Marchandise sortie",
  cloture: "Clôturé",
};

// Construit un instantané concis des données du cabinet pour l'IA.
async function buildCompanyContext(userId: string): Promise<string> {
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("company_id, companies(name)")
      .eq("id", userId)
      .maybeSingle();
    const companyId = profile?.company_id as string | undefined;
    if (!companyId) return "";
    const companyName =
      (profile?.companies as { name?: string } | null)?.name ?? "le cabinet";

    const { data: ships } = await supabaseAdmin
      .from("shipments")
      .select(
        "reference, status, priority, arrival_date, free_time_end, storage_free_end, created_at, clients(name)",
      )
      .eq("company_id", companyId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(80);
    const list = (ships ?? []) as Array<{
      reference: string;
      status: string;
      priority: string;
      free_time_end: string | null;
      storage_free_end: string | null;
      clients: { name?: string } | null;
    }>;

    const { count: clientCount } = await supabaseAdmin
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);
    const { count: staffCount } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayMs = 86400000;
    const deadlineOf = (s: (typeof list)[number]) =>
      s.free_time_end || s.storage_free_end;
    const daysLeft = (d: string) =>
      Math.round((new Date(d).getTime() - today.getTime()) / dayMs);

    const byStatus = new Map<string, number>();
    for (const s of list) byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
    const active = list.filter((s) => s.status !== "cloture");

    const lines = active.slice(0, 40).map((s) => {
      const client = s.clients?.name ?? "client inconnu";
      const d = deadlineOf(s);
      let flag = "";
      if (d) {
        const dl = daysLeft(d);
        if (dl < 0) flag = ` · SURESTARIES DÉPASSÉES de ${-dl} j`;
        else if (dl <= 3) flag = ` · surestaries dans ${dl} j`;
      }
      return `- ${s.reference} · ${client} · ${STATUS_FR[s.status] ?? s.status} · priorité ${s.priority}${flag}`;
    });

    const alerts = active.filter((s) => {
      const d = deadlineOf(s);
      return d ? daysLeft(d) <= 3 : false;
    }).length;

    const statusSummary =
      [...byStatus.entries()]
        .map(([st, n]) => `${STATUS_FR[st] ?? st}: ${n}`)
        .join(", ") || "aucun";

    return [
      "[DONNÉES RÉELLES DU CABINET — à jour. Sers-t'en pour les résumés, états et recommandations.]",
      `Cabinet : ${companyName}. Clients : ${clientCount ?? 0}. Employés : ${staffCount ?? 0}.`,
      `Dossiers actifs (hors clôturés/supprimés) : ${active.length}${alerts ? `, dont ${alerts} en alerte surestaries` : ""}.`,
      `Répartition par statut : ${statusSummary}.`,
      active.length
        ? `Détail des dossiers actifs :\n${lines.join("\n")}`
        : "Aucun dossier actif pour le moment.",
    ].join("\n");
  } catch (e) {
    console.error("[AI context]", e);
    return "";
  }
}

// Convertit une durée ("30", "2.5s", "7m30s", "1h2m") en secondes.
function parseDurationToSeconds(v: string | null): number | null {
  if (!v) return null;
  const s = v.trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.ceil(parseFloat(s));
  const re = /(\d+(?:\.\d+)?)\s*(h|m|s)/g;
  let total = 0;
  let found = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    found = true;
    const n = parseFloat(m[1]);
    total += m[2] === "h" ? n * 3600 : m[2] === "m" ? n * 60 : n;
  }
  return found ? Math.ceil(total) : null;
}

// Formate un nombre de secondes en français lisible.
function humanWait(sec: number): string {
  if (sec <= 60) return `${sec} seconde${sec > 1 ? "s" : ""}`;
  if (sec < 3600) {
    const min = Math.ceil(sec / 60);
    return `${min} minute${min > 1 ? "s" : ""}`;
  }
  const h = Math.floor(sec / 3600);
  const min = Math.round((sec % 3600) / 60);
  return min ? `${h} h ${min} min` : `${h} heure${h > 1 ? "s" : ""}`;
}

type GroqResponse = {
  choices?: { message?: { content?: string } }[];
};

// Appel Groq mutualisé, avec gestion d'erreurs lisible pour les utilisateurs.
async function runGroq(body: Record<string, unknown>): Promise<GroqResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey)
    throw new Error(
      "L'assistant n'est pas encore configuré. Contactez l'administrateur.",
    );

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, ...body }),
    });
  } catch (e) {
    console.error("[Groq] erreur réseau", e);
    throw new Error(
      "Impossible de joindre l'assistant pour le moment. Vérifiez votre connexion et réessayez.",
    );
  }

  if (!res.ok) {
    const b = await res.text();
    console.error(`[Groq] ${res.status} ${res.statusText} — ${b}`);

    if (res.status === 429) {
      const waitSec =
        parseDurationToSeconds(res.headers.get("retry-after")) ??
        parseDurationToSeconds(res.headers.get("x-ratelimit-reset-tokens")) ??
        parseDurationToSeconds(res.headers.get("x-ratelimit-reset-requests"));
      const quand = waitSec
        ? ` Réessayez dans ${humanWait(waitSec)}.`
        : " Réessayez dans quelques minutes.";
      const cause =
        waitSec != null && waitSec > 15 * 60
          ? "La limite quotidienne de l'assistant est atteinte."
          : "L'assistant reçoit trop de demandes en ce moment.";
      throw new Error(`${cause}${quand}`);
    }
    if (res.status === 401 || res.status === 403)
      throw new Error(
        "L'assistant est momentanément indisponible (problème de configuration). Merci de réessayer plus tard.",
      );
    if (res.status === 400 || res.status === 413)
      throw new Error(
        "Le texte est trop long pour l'assistant. Raccourcissez-le et réessayez.",
      );
    if (res.status >= 500)
      throw new Error(
        "L'assistant est temporairement indisponible. Réessayez dans quelques instants.",
      );
    throw new Error(
      "Une erreur est survenue avec l'assistant. Réessayez dans un instant.",
    );
  }

  try {
    return (await res.json()) as GroqResponse;
  } catch {
    throw new Error(
      "Réponse inattendue de l'assistant. Réessayez dans un instant.",
    );
  }
}

// ── Assistant conversationnel ───────────────────────────────────────────────
export const chatWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const userId = (context as { userId: string }).userId;
    const companyContext = await buildCompanyContext(userId);
    const json = await runGroq({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(companyContext
          ? [{ role: "system" as const, content: companyContext }]
          : []),
        ...data.messages,
      ],
    });
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply)
      throw new Error(
        "L'assistant n'a pas pu générer de réponse. Reformulez votre question.",
      );
    return { reply };
  });

// ── Extraction d'un dossier depuis un bloc de texte libre ────────────────────
const ExtractInput = z.object({
  text: z.string().min(1).max(8000),
});

const EXTRACT_PROMPT = `Tu extrais les informations d'un dossier de dédouanement à l'import (Sénégal) à partir d'un texte brut (email, connaissement, message).
Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, avec exactement ces clés :
{
  "reference": string,            // référence/numéro de dossier, sinon ""
  "priority": "basse"|"standard"|"haute"|"critique",  // "standard" si non précisé
  "vessel_name": string,          // nom du navire
  "shipping_company": string,     // compagnie maritime (MSC, Maersk, CMA CGM...)
  "bl_number": string,            // numéro de connaissement (BL)
  "container_number": string,     // numéro de conteneur (type ABCU1234567) OU, pour un véhicule sans conteneur, le numéro de châssis
  "origin_country": string,       // pays d'origine
  "origin_port": string,          // port d'origine / de chargement
  "arrival_date": string,         // date d'arrivée au format AAAA-MM-JJ, sinon ""
  "goods_description": string,    // nature des marchandises
  "goods_value": number|null,     // valeur en FCFA, nombre sans séparateurs, sinon null
  "customs_regime": string,       // régime douanier
  "client_name": string,          // nom de l'importateur/client si mentionné, sinon ""
  "notes": string                 // toute autre info utile
}
Règles STRICTES : n'invente jamais une valeur. Mets "" (ou null pour goods_value) si l'information est absente du texte. Convertis les dates au format AAAA-MM-JJ. Convertis les montants en nombre (ex : "18 500 000 FCFA" -> 18500000). Pour un véhicule, mets le numéro de châssis dans container_number. Reporte le numéro BESC/BSC dans notes s'il est présent.`;

export const extractDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => ExtractInput.parse(data))
  .handler(async ({ data }) => {
    const json = await runGroq({
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_PROMPT },
        { role: "user", content: data.text },
      ],
    });

    const content = json.choices?.[0]?.message?.content ?? "{}";
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new Error(
        "Impossible d'extraire les informations. Reformulez le texte ou saisissez manuellement.",
      );
    }

    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const priorities = ["basse", "standard", "haute", "critique"];
    const p = str(raw.priority).toLowerCase();

    let value: number | null = null;
    if (typeof raw.goods_value === "number") value = raw.goods_value;
    else if (typeof raw.goods_value === "string") {
      const n = Number(raw.goods_value.replace(/[^\d]/g, ""));
      value = Number.isFinite(n) && n > 0 ? n : null;
    }

    return {
      fields: {
        reference: str(raw.reference),
        priority: priorities.includes(p) ? p : "standard",
        vessel_name: str(raw.vessel_name),
        shipping_company: str(raw.shipping_company),
        bl_number: str(raw.bl_number),
        container_number: str(raw.container_number),
        origin_country: str(raw.origin_country),
        origin_port: str(raw.origin_port),
        arrival_date: str(raw.arrival_date),
        goods_description: str(raw.goods_description),
        goods_value: value,
        customs_regime: str(raw.customs_regime),
        client_name: str(raw.client_name),
        notes: str(raw.notes),
      },
    };
  });
