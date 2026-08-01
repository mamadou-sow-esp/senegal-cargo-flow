import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPlan } from "@/lib/plans";
import { STATUS_ORDER } from "@/lib/status";

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
- Créer ou modifier des dossiers directement quand on te le demande, via les outils \`create_dossier\` et \`update_dossier\`.

RÈGLES POUR CRÉER / MODIFIER UN DOSSIER :
- Utilise l'outil \`create_dossier\` dès que l'utilisateur te donne assez d'informations pour ouvrir un dossier (au minimum une référence, ou des infos permettant d'en déduire une). N'invente jamais un numéro de BL, de conteneur ou une valeur : laisse le champ vide si l'info manque.
- Utilise l'outil \`update_dossier\` pour changer un statut, une échéance, une priorité ou tout autre champ d'un dossier existant, en identifiant le dossier par sa référence. Statuts valides, exactement sous cette forme : cree, documents_attente, documents_complets, declaration_preparee, declaration_deposee, attente_validation, controle_documentaire, controle_physique, paiement_droits, bon_a_enlever, marchandise_sortie, cloture. N'utilise jamais un autre mot pour un statut.
- Si la référence donnée ne correspond à aucun dossier, correspond à plusieurs, ou s'il te manque une information indispensable, ne devine jamais : pose une question claire en français à l'utilisateur.
- Après chaque création ou modification réussie, confirme précisément ce qui a été fait (référence, champs modifiés) en langage naturel. Si l'outil renvoie une erreur, explique-la simplement et propose une correction.
- Si tu dois agir sur PLUSIEURS dossiers dans le même message (ex : en clôturer trois), fais un appel d'outil séparé pour chacun via le mécanisme natif de function calling. N'essaie jamais de les décrire ou de les regrouper sous forme de texte ou de pseudo-code.
- INTERDICTION ABSOLUE, sans aucune exception : n'écris JAMAIS dans le texte de ta réponse le nom d'un outil, un appel de fonction, du JSON brut, ni une syntaxe imitant un appel d'outil — que ce soit \`update_dossier(...)\`, \`create_dossier(...)\`, des balises comme \`<function>\`, \`<tool_call>\`, \`<function(update_dossier)=...></function>\`, ou tout autre format similaire. Les outils s'appellent UNIQUEMENT via le mécanisme de function calling natif, jamais en texte visible. Ta réponse visible ne doit contenir que du français naturel, sans crochets, balises ni accolades techniques.

FORMAT DE RÉPONSE (respecte-le strictement, sois lisible) :
- Écris en français, en phrases courtes.
- Pour toute liste, utilise UNIQUEMENT des puces commençant par un tiret « - ». N'utilise JAMAIS « + » ni « * » comme puce.
- Emploie le gras (**texte**) avec parcimonie, seulement pour un intitulé de section ou un chiffre clé.
- Pas de tableaux ni de titres markdown à dièses, et jamais de code ni de blocs de code.
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

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type GroqMessage = {
  role: string;
  content?: string | null;
  tool_calls?: ToolCall[];
};

type GroqResponse = {
  choices?: { message?: GroqMessage }[];
};

// ── Outils exposés à l'IA : création / modification de dossiers ─────────────
const DOSSIER_FIELDS_SCHEMA = {
  client_name: { type: "string", description: "Nom du client/importateur (recherché par correspondance approximative)." },
  priority: { type: "string", enum: ["basse", "standard", "haute", "critique"] },
  vessel_name: { type: "string", description: "Nom du navire." },
  shipping_company: { type: "string", description: "Compagnie maritime (MSC, Maersk, CMA CGM...)." },
  bl_number: { type: "string", description: "Numéro de connaissement (BL)." },
  container_number: { type: "string", description: "Numéro de conteneur ou numéro de châssis pour un véhicule." },
  origin_country: { type: "string" },
  origin_port: { type: "string" },
  arrival_date: { type: "string", description: "Format AAAA-MM-JJ." },
  goods_description: { type: "string" },
  goods_value: { type: "number", description: "Valeur en FCFA." },
  customs_regime: { type: "string" },
  notes: { type: "string" },
  free_time_end: { type: "string", description: "Fin de franchise conteneur, format AAAA-MM-JJ." },
  storage_free_end: { type: "string", description: "Fin de franchise magasinage, format AAAA-MM-JJ." },
} as const;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_dossier",
      description: "Crée un nouveau dossier de dédouanement dans le logiciel.",
      parameters: {
        type: "object",
        properties: {
          reference: { type: "string", description: "Référence interne du dossier (obligatoire)." },
          ...DOSSIER_FIELDS_SCHEMA,
        },
        required: ["reference"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_dossier",
      description: "Modifie un dossier existant (statut, priorité, échéances, informations diverses), identifié par sa référence.",
      parameters: {
        type: "object",
        properties: {
          reference: { type: "string", description: "Référence du dossier à modifier (obligatoire)." },
          new_reference: { type: "string", description: "Nouvelle référence, seulement si on te demande de la changer." },
          status: { type: "string", enum: STATUS_ORDER, description: "Nouveau statut du dossier." },
          ...DOSSIER_FIELDS_SCHEMA,
        },
        required: ["reference"],
      },
    },
  },
] as const;

const PriorityEnum = z.enum(["basse", "standard", "haute", "critique"]);

const CreateDossierArgs = z.object({
  reference: z.string().min(1),
  client_name: z.string().trim().optional(),
  priority: PriorityEnum.optional(),
  vessel_name: z.string().optional(),
  shipping_company: z.string().optional(),
  bl_number: z.string().optional(),
  container_number: z.string().optional(),
  origin_country: z.string().optional(),
  origin_port: z.string().optional(),
  arrival_date: z.string().optional(),
  goods_description: z.string().optional(),
  goods_value: z.number().optional(),
  customs_regime: z.string().optional(),
  notes: z.string().optional(),
  free_time_end: z.string().optional(),
  storage_free_end: z.string().optional(),
});

const UpdateDossierArgs = CreateDossierArgs.extend({
  new_reference: z.string().optional(),
  status: z.enum(STATUS_ORDER as [string, ...string[]]).optional(),
});

type SupaLike = {
  from: (table: string) => any;
};

async function findClientId(
  supabase: SupaLike,
  companyId: string,
  name: string | undefined,
): Promise<string | null> {
  if (!name) return null;
  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .eq("company_id", companyId);
  const target = name.trim().toLowerCase();
  if (!target) return null;
  const list = (data ?? []) as { id: string; name: string }[];
  const found = list.find(
    (c) =>
      c.name.toLowerCase().includes(target) || target.includes(c.name.toLowerCase()),
  );
  return found?.id ?? null;
}

async function toolCreateDossier(
  supabase: SupaLike,
  userId: string,
  companyId: string,
  argsRaw: string,
): Promise<Record<string, unknown>> {
  let parsed: z.infer<typeof CreateDossierArgs>;
  try {
    parsed = CreateDossierArgs.parse(JSON.parse(argsRaw));
  } catch {
    return { ok: false, reason: "invalid_arguments" };
  }

  const client_id = await findClientId(supabase, companyId, parsed.client_name);

  const payload: Record<string, unknown> = {
    company_id: companyId,
    created_by: userId,
    reference: parsed.reference.trim(),
    client_id,
    priority: parsed.priority ?? "standard",
    vessel_name: parsed.vessel_name || null,
    shipping_company: parsed.shipping_company || null,
    bl_number: parsed.bl_number || null,
    container_number: parsed.container_number || null,
    origin_country: parsed.origin_country || null,
    origin_port: parsed.origin_port || null,
    arrival_date: parsed.arrival_date || null,
    goods_description: parsed.goods_description || null,
    goods_value: parsed.goods_value ?? null,
    customs_regime: parsed.customs_regime || null,
    notes: parsed.notes || null,
    free_time_end: parsed.free_time_end || null,
    storage_free_end: parsed.storage_free_end || null,
  };

  const { data, error } = await supabase
    .from("shipments")
    .insert(payload)
    .select("id, reference")
    .single();

  if (error) return { ok: false, reason: "db_error", message: error.message };

  return {
    ok: true,
    id: data.id,
    reference: data.reference,
    client_requested: parsed.client_name ?? null,
    client_matched: !!client_id,
  };
}

async function toolUpdateDossier(
  supabase: SupaLike,
  companyId: string,
  argsRaw: string,
): Promise<Record<string, unknown>> {
  let parsed: z.infer<typeof UpdateDossierArgs>;
  try {
    parsed = UpdateDossierArgs.parse(JSON.parse(argsRaw));
  } catch {
    return { ok: false, reason: "invalid_arguments" };
  }

  const ref = parsed.reference.trim();
  const { data: candidates } = await supabase
    .from("shipments")
    .select("id, reference")
    .eq("company_id", companyId)
    .ilike("reference", `%${ref}%`)
    .limit(5);

  const list = (candidates ?? []) as { id: string; reference: string }[];
  const exact = list.find((c) => c.reference.toLowerCase() === ref.toLowerCase());
  const match = exact ?? (list.length === 1 ? list[0] : null);

  if (!match) {
    if (!list.length) return { ok: false, reason: "not_found", reference: ref };
    return {
      ok: false,
      reason: "ambiguous",
      reference: ref,
      matches: list.map((c) => c.reference),
    };
  }

  const client_id = await findClientId(supabase, companyId, parsed.client_name);

  const update: Record<string, unknown> = {};
  if (parsed.status !== undefined) update.status = parsed.status;
  if (parsed.priority !== undefined) update.priority = parsed.priority;
  if (parsed.vessel_name !== undefined) update.vessel_name = parsed.vessel_name;
  if (parsed.shipping_company !== undefined) update.shipping_company = parsed.shipping_company;
  if (parsed.bl_number !== undefined) update.bl_number = parsed.bl_number;
  if (parsed.container_number !== undefined) update.container_number = parsed.container_number;
  if (parsed.origin_country !== undefined) update.origin_country = parsed.origin_country;
  if (parsed.origin_port !== undefined) update.origin_port = parsed.origin_port;
  if (parsed.arrival_date !== undefined) update.arrival_date = parsed.arrival_date;
  if (parsed.goods_description !== undefined) update.goods_description = parsed.goods_description;
  if (parsed.goods_value !== undefined) update.goods_value = parsed.goods_value;
  if (parsed.customs_regime !== undefined) update.customs_regime = parsed.customs_regime;
  if (parsed.notes !== undefined) update.notes = parsed.notes;
  if (parsed.free_time_end !== undefined) update.free_time_end = parsed.free_time_end;
  if (parsed.storage_free_end !== undefined) update.storage_free_end = parsed.storage_free_end;
  if (parsed.new_reference) update.reference = parsed.new_reference.trim();
  if (client_id) update.client_id = client_id;

  if (!Object.keys(update).length) return { ok: false, reason: "no_fields" };

  const { error } = await supabase.from("shipments").update(update).eq("id", match.id);
  if (error) return { ok: false, reason: "db_error", message: error.message };

  return {
    ok: true,
    reference: parsed.new_reference || match.reference,
    updated_fields: Object.keys(update),
  };
}

// Détecte un faux appel d'outil écrit en texte (donc jamais exécuté).
const FAKE_TOOL_SYNTAX =
  /<(function|tool_call|tool)\b|\b(?:create_dossier|update_dossier)\s*\(|\bfunction\s*\((?:create_dossier|update_dossier)\)\s*=/i;

// Filet de sécurité : au cas où le modèle écrirait quand même une syntaxe
// d'appel d'outil en toutes lettres, on la retire avant d'afficher la réponse.
function stripToolSyntax(text: string): string {
  return text
    // <function(update_dossier)={...}></function>, <tool_call>...</tool_call>, etc.
    .replace(/<(function|tool_call|tool)[^>]*>[\s\S]*?<\/\1>/gi, "")
    // Balises orphelines si la paire n'a pas matché (fermeture manquante/différente).
    .replace(/<\/?(function|tool_call|tool)\b[^>]*>/gi, "")
    // update_dossier(...) / create_dossier(...) écrits en texte brut.
    .replace(/`?\b(?:create_dossier|update_dossier)\s*\([^)]*\)`?/gi, "")
    // function(update_dossier)=... écrit hors balises.
    .replace(/\bfunction\s*\((?:create_dossier|update_dossier)\)\s*=\s*\{[^}]*\}/gi, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function runTool(
  supabase: SupaLike,
  userId: string,
  companyId: string,
  call: ToolCall,
): Promise<Record<string, unknown>> {
  try {
    if (call.function.name === "create_dossier")
      return await toolCreateDossier(supabase, userId, companyId, call.function.arguments);
    if (call.function.name === "update_dossier")
      return await toolUpdateDossier(supabase, companyId, call.function.arguments);
    return { ok: false, reason: "unknown_tool" };
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "erreur inconnue" };
  }
}

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
    const { userId, supabase: userSupabase } = context as {
      userId: string;
      supabase: SupaLike;
    };
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Cabinet + formule → quota IA journalier en essai.
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    const companyId = prof?.company_id as string | undefined;

    if (companyId) {
      const { data: comp } = await supabaseAdmin
        .from("companies")
        .select("subscription_plan")
        .eq("id", companyId)
        .maybeSingle();
      const plan = getPlan(comp?.subscription_plan);
      if (plan.aiPerDay != null) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const { count } = await supabaseAdmin
          .from("ai_log")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("created_at", start.toISOString());
        if ((count ?? 0) >= plan.aiPerDay)
          throw new Error(
            `Limite de l'essai atteinte : ${plan.aiPerDay} questions à l'assistant par jour. Activez le mode Pro pour un accès illimité.`,
          );
      }
    }

    const companyContext = companyId ? await buildCompanyContext(userId) : "";
    const baseMessages: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(companyContext
        ? [{ role: "system" as const, content: companyContext }]
        : []),
      ...data.messages,
    ];

    // Seuls les cabinets identifiés peuvent déclencher création/modification.
    const canUseTools = !!companyId;
    let json = await runGroq({
      messages: baseMessages,
      ...(canUseTools ? { tools: TOOLS, tool_choice: "auto" } : {}),
    });
    let message = json.choices?.[0]?.message;

    // Filet de rattrapage : le modèle a parfois « halluciné » un faux appel
    // d'outil écrit en texte (ex. <function(update_dossier)={...}>) au lieu
    // d'utiliser le vrai mécanisme de function calling — dans ce cas, RIEN
    // n'a réellement été exécuté. On lui redonne une chance explicite plutôt
    // que de laisser passer une réponse qui prétend à tort avoir agi.
    if (
      canUseTools &&
      !message?.tool_calls?.length &&
      message?.content &&
      FAKE_TOOL_SYNTAX.test(message.content)
    ) {
      json = await runGroq({
        messages: [
          ...baseMessages,
          {
            role: "system",
            content:
              "Ta réponse précédente contenait un faux appel d'outil écrit en texte : cela n'exécute rien. Recommence ta réponse à la dernière question de l'utilisateur. Si une action sur un ou plusieurs dossiers est nécessaire, utilise réellement le mécanisme de function calling (un appel d'outil par dossier si besoin), sans jamais l'écrire en texte.",
          },
        ],
        tools: TOOLS,
        tool_choice: "auto",
      });
      message = json.choices?.[0]?.message;
    }

    // L'IA a demandé une ou plusieurs actions (créer/modifier un dossier) :
    // on les exécute puis on redemande une réponse en langage naturel.
    if (canUseTools && message?.tool_calls?.length) {
      const toolResults: Array<Record<string, unknown>> = [];
      for (const call of message.tool_calls) {
        const result = await runTool(userSupabase, userId, companyId!, call);
        toolResults.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      json = await runGroq({
        messages: [
          ...baseMessages,
          {
            role: "assistant",
            content: message.content ?? "",
            tool_calls: message.tool_calls,
          },
          ...toolResults,
        ],
      });
      message = json.choices?.[0]?.message;
    }

    const reply = stripToolSyntax(message?.content?.trim() ?? "");
    if (!reply)
      throw new Error(
        "L'assistant n'a pas pu générer de réponse. Reformulez votre question.",
      );

    // Journalise la requête (compteur du quota IA).
    if (companyId)
      await supabaseAdmin
        .from("ai_log")
        .insert({ company_id: companyId, user_id: userId });

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
