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

const SYSTEM_PROMPT = `Tu es « Clear Flower AI », l'assistant expert des commissionnaires en douane (transitaires) au Sénégal.

Ton rôle :
- Aider les transitaires à gérer leurs dossiers de dédouanement à l'importation.
- Expliquer les procédures GAINDE / COTECNA / Douanes sénégalaises, les documents requis (BL, facture commerciale, packing list, certificat d'origine, DPI, BAE, quittance, etc.), les incoterms, les régimes douaniers et le calcul indicatif des droits & taxes (DD, TVA 18%, PCS, PC, RS).
- Donner des réponses concises, structurées, professionnelles, en français.
- Toujours rappeler que les montants et délais sont indicatifs et doivent être vérifiés auprès de l'Administration des douanes.

Style : sobre, précis, orienté action. Utilise des listes courtes quand utile.`;

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

export const chatWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey)
      throw new Error(
        "L'assistant n'est pas encore configuré. Contactez l'administrateur.",
      );

    // Groq — endpoint compatible OpenAI, réellement gratuit (sans carte).
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    let res: Response;
    try {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...data.messages,
          ],
        }),
      });
    } catch (e) {
      console.error("[Groq] erreur réseau", e);
      throw new Error(
        "Impossible de joindre l'assistant pour le moment. Vérifiez votre connexion et réessayez.",
      );
    }

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Groq] ${res.status} ${res.statusText} — ${body}`);

      // Quota / limite de débit atteint : on indique le temps d'attente.
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

      // Clé invalide / expirée : problème de configuration, pas de l'utilisateur.
      if (res.status === 401 || res.status === 403)
        throw new Error(
          "L'assistant est momentanément indisponible (problème de configuration). Merci de réessayer plus tard.",
        );

      // Requête trop volumineuse.
      if (res.status === 400 || res.status === 413)
        throw new Error(
          "Votre message est trop long pour l'assistant. Raccourcissez-le et réessayez.",
        );

      // Panne côté fournisseur.
      if (res.status >= 500)
        throw new Error(
          "L'assistant est temporairement indisponible. Réessayez dans quelques instants.",
        );

      throw new Error(
        "Une erreur est survenue avec l'assistant. Réessayez dans un instant.",
      );
    }

    let json: { choices?: { message?: { content?: string } }[] };
    try {
      json = (await res.json()) as typeof json;
    } catch {
      throw new Error(
        "Réponse inattendue de l'assistant. Réessayez dans un instant.",
      );
    }
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply)
      throw new Error(
        "L'assistant n'a pas pu générer de réponse. Reformulez votre question.",
      );
    return { reply };
  });
