# Cutting the teacher's spoken tag out of the Hören audio (2026-10-15)

Many Hören recordings contain a spoken tag — "Deutschlehrer Orhan Yigit", "Mit den Beiträgen des Deutschlehrers …", "Vorbereitet vom Deutschlehrer …". The owner asked to remove the name.

**Result:** 61 files re-cut, uploaded as NEW objects under `hoeren-audio/notag/…` (the `clean/…` originals stay untouched); 73 exercises now point at them. Everything is reversible with the `*-rollback*.sql` files.

## Pipeline
1. `tag-detect.mjs` – ASR pass (old transcripts → Groq word timestamps) found the tag in 54 files (83 spans, `tag-spans-valid.json`).
2. `tag-cut.mjs` – cuts each span, snapping both edges to the quietest 10 ms frame, 25 ms fades; a tag at the very end cuts to EOF. `SPANS=… CUTS=… node tag-cut.mjs`.
3. `tag-verify.mjs` – re-transcribes both sides of every cut (plain + tag-prompted Groq); 83/83 clean.
4. `tag-upload.mjs` → `tag-gen-switch.mjs` – upload, then one transaction: audio_path switch for every exercise sharing the file; Buchhandlung's audio-based learning-aid timestamps and its `hoeren_transcripts` row are shifted by the cut map.
5. **Round 2 – acoustic fingerprint** (`fp-*.mjs`): 16 files had no transcript and the ASR pass is fooled in both directions (Whisper invents the tag in pauses when prompted, and drops end-of-file tags when not). The tag is a re-used spoken clip, so MFCC + subsequence-DTW against 12 cluster representatives (`fp-cluster.mjs`) finds it without any ASR: true tags cost 7–15, speech ≈ 30+. Recall on the 83 known spans: 82/83, and it found one intro tag the ASR pass had missed (`hannover-zugteil`). Round 2 = 7 more files + `hannover-zugteil.v2` (`tag-switch-round2.sql`).
6. Final check: fingerprint scan of all 61 outputs (no hit ≤ 15; two 15.5 hits were ordinary speech) and of the 47 remaining untagged files (no hit ≤ 16).

Known leftover: the radio station in `Markus (Original/معدل)` is called "Radio JIT" (3×) in the exam text itself — left as is.
