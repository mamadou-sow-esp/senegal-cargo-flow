import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ============================================================
// Portail client PUBLIC (sans connexion) — accès par jeton.
// Le jeton (UUID non devinable) fait office de secret : quiconque
// possède le lien voit le suivi en lecture seule des dossiers du client.
// ============================================================

export const clientPortalData = createServerFn({ method: "POST" })
  .validator((d) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("id, name, company_id")
      .eq("portal_token", data.token)
      .maybeSingle();
    if (!client) throw new Error("Lien de suivi invalide.");

    const { data: comp } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", client.company_id)
      .maybeSingle();

    const { data: ships } = await supabaseAdmin
      .from("shipments")
      .select(
        "id, reference, status, priority, arrival_date, vessel_name, shipping_company, bl_number, container_number, origin_country, origin_port, goods_description, free_time_end, storage_free_end, created_at",
      )
      .eq("client_id", client.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    const shipments = (ships ?? []) as Array<{ id: string }>;
    const ids = shipments.map((s) => s.id);

    const docsBy = new Map<string, Array<{ id: string; name: string; category: string | null }>>();
    const comsBy = new Map<string, Array<{ id: string; body: string; created_at: string }>>();
    if (ids.length) {
      const { data: docs } = await supabaseAdmin
        .from("documents")
        .select("id, shipment_id, name, category")
        .eq("is_client_visible", true)
        .in("shipment_id", ids);
      for (const d of docs ?? []) {
        const row = d as { id: string; shipment_id: string; name: string; category: string | null };
        const l = docsBy.get(row.shipment_id) ?? [];
        l.push({ id: row.id, name: row.name, category: row.category });
        docsBy.set(row.shipment_id, l);
      }
      const { data: coms } = await supabaseAdmin
        .from("comments")
        .select("id, shipment_id, body, created_at")
        .eq("is_public", true)
        .in("shipment_id", ids)
        .order("created_at", { ascending: true });
      for (const c of coms ?? []) {
        const row = c as { id: string; shipment_id: string; body: string; created_at: string };
        const l = comsBy.get(row.shipment_id) ?? [];
        l.push({ id: row.id, body: row.body, created_at: row.created_at });
        comsBy.set(row.shipment_id, l);
      }
    }

    return {
      clientName: client.name,
      cabinetName: comp?.name ?? "Votre transitaire",
      dossiers: (shipments as Array<Record<string, unknown>>).map((s) => ({
        ...s,
        documents: docsBy.get(s.id as string) ?? [],
        comments: comsBy.get(s.id as string) ?? [],
      })),
    };
  });

// Génère une URL signée de téléchargement pour un document visible du client.
export const clientPortalDocUrl = createServerFn({ method: "POST" })
  .validator((d) =>
    z.object({ token: z.string().uuid(), docId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("portal_token", data.token)
      .maybeSingle();
    if (!client) throw new Error("Lien invalide.");

    const { data: doc } = await supabaseAdmin
      .from("documents")
      .select("storage_path, shipment_id, is_client_visible")
      .eq("id", data.docId)
      .maybeSingle();
    if (!doc || !doc.is_client_visible)
      throw new Error("Document indisponible.");

    const { data: ship } = await supabaseAdmin
      .from("shipments")
      .select("client_id")
      .eq("id", doc.shipment_id)
      .maybeSingle();
    if (!ship || ship.client_id !== client.id)
      throw new Error("Accès refusé.");

    const { data: signed, error } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(doc.storage_path as string, 120);
    if (error || !signed?.signedUrl)
      throw new Error("Téléchargement impossible.");
    return { url: signed.signedUrl };
  });
