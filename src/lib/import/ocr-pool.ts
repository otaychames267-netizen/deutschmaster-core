/**
 * ocr-pool.ts — a pool of Tesseract workers for PARALLEL OCR.
 *
 * Tesseract.js workers are independent WASM instances, so running several
 * concurrently gives real parallelism on multi-core machines. Used to speed up
 * the OCR-heavy passes (role classification, article OCR) without changing the
 * single-worker code paths.
 */
import { createWorker, type Worker } from "tesseract.js";
import * as os from "node:os";

let pool: Worker[] = [];

export async function initPool(size?: number): Promise<void> {
  if (pool.length) return;
  const n = size ?? Math.max(2, Math.min(6, (os.cpus()?.length ?? 4) - 1));
  pool = await Promise.all(Array.from({ length: n }, () => createWorker(["deu", "eng"], 1, { langPath: process.cwd(), cachePath: process.cwd(), gzip: false, logger: () => {} })));
}

export async function destroyPool(): Promise<void> {
  await Promise.all(pool.map((w) => w.terminate().catch(() => {})));
  pool = [];
}

export function poolSize(): number { return pool.length; }

/**
 * Process items concurrently across the worker pool. `fn` receives an item and a
 * dedicated worker; results preserve input order.
 */
export async function mapConcurrent<T, R>(items: T[], fn: (item: T, worker: Worker, index: number) => Promise<R>, size?: number): Promise<R[]> {
  if (!pool.length) await initPool(size);
  const results: R[] = new Array(items.length);
  let next = 0;
  async function runner(w: Worker) {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], w, i);
    }
  }
  await Promise.all(pool.map((w) => runner(w)));
  return results;
}
