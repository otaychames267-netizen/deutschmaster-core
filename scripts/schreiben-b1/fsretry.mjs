// Windows (Defender / indexer) sometimes holds a freshly read file for a moment and writeFileSync fails with "UNKNOWN: open" — retry.
import { writeFileSync } from "node:fs";
export function writeRetry(path, data) {
  for (let i = 0; i < 12; i++) {
    try { writeFileSync(path, data); return; } catch (e) {
      if (i === 11) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    }
  }
}
