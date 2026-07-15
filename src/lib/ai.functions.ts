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

export const chatWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    const res = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...data.messages,
          ],
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429)
        throw new Error(
          "Trop de requêtes vers l'IA. Réessayez dans un instant.",
        );
      if (res.status === 402)
        throw new Error(
          "Crédits IA épuisés. Rechargez le workspace pour continuer.",
        );
      throw new Error(`Erreur IA (${res.status}): ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Réponse IA vide.");
    return { reply };
  });
