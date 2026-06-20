import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ListInput = {
  level: "b1" | "b2";
  module: "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich";
  teil: number;
};

export const listPublishedExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListInput) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("exercises")
      .select("id,level,module,teil,position,title,prompt,passage,audio_id,kind,options,explanation,collection_id")
      .eq("level", data.level)
      .eq("module", data.module)
      .eq("teil", data.teil)
      .eq("status", "published")
      .order("created_at", { ascending: true })
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);

    // Look up collection titles for grouping. Missing collection => "Ungrouped".
    const collectionIds = Array.from(new Set((rows ?? []).map((r: any) => r.collection_id).filter(Boolean))) as string[];
    const collections: Record<string, { id: string; title: string }> = {};
    if (collectionIds.length) {
      const { data: cols } = await context.supabase
        .from("exercise_collections")
        .select("id,title")
        .in("id", collectionIds);
      for (const c of cols ?? []) collections[(c as any).id] = c as any;
    }

    // Resolve audio signed URLs for hoeren module
    const audioIds = Array.from(new Set((rows ?? []).map((r) => r.audio_id).filter(Boolean))) as string[];
    const signed: Record<string, string> = {};
    if (audioIds.length) {
      const { data: assets } = await context.supabase
        .from("audio_assets")
        .select("id,storage_path")
        .in("id", audioIds);
      for (const a of assets ?? []) {
        const { data: s } = await context.supabase.storage.from("audio").createSignedUrl(a.storage_path, 3600);
        if (s?.signedUrl) signed[a.id] = s.signedUrl;
      }
    }
    return { exercises: rows ?? [], audioUrls: signed, collections };
  });