/**
 * Supabase-backed VoiceAssignmentStore. Kept separate from voiceManager.ts
 * so the manager's actual selection logic stays testable without a real
 * database (see voiceManager.test.ts) — this file is just the persistence
 * adapter, injected in at startup.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VoiceAssignmentStore } from "./voiceManager.js";

export function createSupabaseVoiceStore(admin: SupabaseClient): VoiceAssignmentStore {
  return {
    async get(sessionKey, characterId) {
      const { data, error } = await admin
        .from("muendlich_voice_assignments")
        .select("voice_id")
        .eq("session_key", sessionKey)
        .eq("character_id", characterId)
        .maybeSingle();
      if (error) {
        console.error("[voice] failed to read assignment:", error.message);
        return null;
      }
      return data?.voice_id ?? null;
    },

    async set(sessionKey, characterId, voiceId) {
      // upsert on the (session_key, character_id) unique constraint — safe
      // if two ticks race to assign the same session (only one write wins,
      // the other is a no-op update to the same value).
      const { error } = await admin
        .from("muendlich_voice_assignments")
        .upsert(
          { session_key: sessionKey, character_id: characterId, voice_id: voiceId },
          { onConflict: "session_key,character_id" },
        );
      if (error) console.error("[voice] failed to persist assignment:", error.message);
    },

    async getUsageCounts(voiceIds) {
      if (voiceIds.length === 0) return {};
      // Simple recency window (last 500 assignments) rather than all-time —
      // all-time counts would make early-assigned voices permanently look
      // "overused" relative to voices added later, which is exactly the
      // "allow future expansion to hundreds of voices" case the load
      // balancer needs to stay fair under.
      const { data, error } = await admin
        .from("muendlich_voice_assignments")
        .select("voice_id")
        .in("voice_id", voiceIds)
        .order("assigned_at", { ascending: false })
        .limit(500);
      if (error) {
        console.error("[voice] failed to read usage counts:", error.message);
        return {};
      }
      const counts: Record<string, number> = {};
      for (const row of data ?? []) counts[row.voice_id] = (counts[row.voice_id] ?? 0) + 1;
      return counts;
    },
  };
}
