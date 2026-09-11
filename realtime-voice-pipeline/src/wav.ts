/** Minimal PCM16 mono WAV <-> raw-PCM helpers. Both vendors speak raw PCM16
 * over the wire (Deepgram accepts linear16, Cartesia emits raw pcm_s16le) —
 * WAV is only needed at the two filesystem boundaries (reading the fixture,
 * writing the reply for a human to listen to), so a full parser isn't
 * warranted; this only handles the canonical 44-byte-header case every
 * synthesizer in this pipeline actually produces. */

export interface PcmAudio {
  sampleRate: number;
  channels: number;
  pcm: Buffer; // raw PCM16LE samples, no header
}

export function readWav(buf: Buffer): PcmAudio {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a RIFF/WAVE file");
  }
  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let dataStart = -1;
  let dataLen = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bitsPerSample = buf.readUInt16LE(body + 14);
    } else if (id === "data") {
      dataStart = body;
      dataLen = size;
    }
    offset = body + size + (size % 2); // chunks are word-aligned
  }
  if (dataStart < 0) throw new Error("No data chunk found");
  if (bitsPerSample !== 16) throw new Error(`Only PCM16 supported, got ${bitsPerSample}-bit`);
  return { sampleRate, channels, pcm: buf.subarray(dataStart, dataStart + dataLen) };
}

export function writeWav(audio: PcmAudio): Buffer {
  const { sampleRate, channels, pcm } = audio;
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Naive linear-interpolation resample — same tradeoff already accepted in
 * the production app's own mic-capture path (src/lib/muendlich/useRelayAudio.ts):
 * good enough for speech, not audiophile-grade. */
export function resamplePcm16(pcm: Buffer, fromRate: number, toRate: number): Buffer {
  if (fromRate === toRate) return pcm;
  const inSamples = pcm.length / 2;
  const ratio = fromRate / toRate;
  const outSamples = Math.round(inSamples / ratio);
  const out = Buffer.alloc(outSamples * 2);
  for (let i = 0; i < outSamples; i++) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(i0 + 1, inSamples - 1);
    const frac = srcPos - i0;
    const s0 = pcm.readInt16LE(i0 * 2);
    const s1 = pcm.readInt16LE(i1 * 2);
    out.writeInt16LE(Math.round(s0 * (1 - frac) + s1 * frac), i * 2);
  }
  return out;
}
