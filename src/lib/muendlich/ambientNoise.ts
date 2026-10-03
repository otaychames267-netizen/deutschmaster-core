/**
 * Procedurally generated room-tone ambient noise for the optional "Real Exam
 * Atmosphere" toggle — deliberately NOT real recorded paper-shuffling/cough
 * SFX, since there's no legitimate licensed source for that audio in this
 * project. This is filtered white noise shaped into a soft, low room-tone
 * hum, not an attempt to fake specific real-world sounds.
 */
export interface AmbientNoiseHandle {
  stop: () => void;
}

export function startAmbientNoise(audioCtx: AudioContext, volume = 0.03): AmbientNoiseHandle {
  const bufferSize = 2 * audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 480; // shapes harsh white noise into a soft room hum

  const gain = audioCtx.createGain();
  gain.gain.value = volume;

  noise.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();

  return { stop: () => { try { noise.stop(); } catch { /* already stopped */ } noise.disconnect(); lowpass.disconnect(); gain.disconnect(); } };
}
