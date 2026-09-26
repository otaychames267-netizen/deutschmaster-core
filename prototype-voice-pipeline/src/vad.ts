/**
 * vad.ts — lightweight, local, zero-network-round-trip voice-activity
 * detector for fast speech-onset detection.
 *
 * This is the direct fix for the barge-in bottleneck found in the previous
 * round: using Deepgram's interim-transcript event as the "user started
 * talking" signal costs ~1.8-2.8s, because it waits for real
 * transcription work, not just "is there sound." A simple RMS-energy
 * threshold on raw PCM16 frames needs none of that — it can fire within
 * one or two 20ms frames of real audio arriving above a noise floor.
 *
 * Same RMS-over-threshold pattern already proven in production
 * (src/lib/muendlich/useRelayAudio.ts's MIC_ACTIVITY_RMS constant),
 * adapted here from Float32 to PCM16 buffers.
 */

const DEFAULT_RMS_THRESHOLD = 0.02; // matches production's MIC_ACTIVITY_RMS
const DEFAULT_CONSECUTIVE_FRAMES = 2; // debounce — one loud frame alone could be a click/pop, not real speech onset

export function pcm16Rms(frame: Buffer): number {
  const samples = frame.length / 2;
  if (samples === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < frame.length; i += 2) {
    const s = frame.readInt16LE(i) / 0x8000;
    sumSquares += s * s;
  }
  return Math.sqrt(sumSquares / samples);
}

export interface FastVad {
  /** Feed one raw PCM16 frame; returns true exactly once, the frame at
   * which onset is confirmed (consecutive-frames-above-threshold). */
  pushFrame(frame: Buffer): boolean;
  reset(): void;
}

export function createFastVad(rmsThreshold = DEFAULT_RMS_THRESHOLD, consecutiveFrames = DEFAULT_CONSECUTIVE_FRAMES): FastVad {
  let aboveCount = 0;
  let fired = false;
  return {
    pushFrame(frame: Buffer): boolean {
      if (fired) return false;
      const rms = pcm16Rms(frame);
      if (rms >= rmsThreshold) aboveCount++; else aboveCount = 0;
      if (aboveCount >= consecutiveFrames) { fired = true; return true; }
      return false;
    },
    reset() { aboveCount = 0; fired = false; },
  };
}
