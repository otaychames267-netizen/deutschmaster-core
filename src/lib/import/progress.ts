/**
 * progress.ts — event-driven progress + stall watchdog.
 *
 * Every pipeline stage runs inside withWatchdog(): it emits start/done events,
 * and if the stage produces no result within its timeout it is treated as a
 * STALL — the abort signal fires, the exact stage is logged, and a StallError
 * is thrown so the caller can retry or fail fast. No stage ever runs silently
 * for minutes.
 */

export class StallError extends Error {
  constructor(public stage: string, public ms: number) {
    super(`STALL: '${stage}' produced no result within ${ms}ms`);
    this.name = "StallError";
  }
}

let seq = 0;
type Status = "start" | "done" | "stall" | "error" | "info";
export function logEvent(stage: string, status: Status, detail = ""): void {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] #${++seq} ${status.toUpperCase().padEnd(5)} ${stage}${detail ? " — " + detail : ""}`);
}

/**
 * Run `fn` under a stall watchdog. `fn` receives an AbortSignal it should pass to
 * any cancellable work (fetch, etc.). If `fn` doesn't resolve within `ms`, the
 * signal is aborted, a stall is logged, and a StallError is thrown.
 */
export async function withWatchdog<T>(stage: string, ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const t0 = Date.now();
  logEvent(stage, "start");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { ctrl.abort(); logEvent(stage, "stall", `no progress in ${ms}ms — aborting`); reject(new StallError(stage, ms)); }, ms);
  });
  try {
    const result = await Promise.race([fn(ctrl.signal), timeout]);
    logEvent(stage, "done", `${Date.now() - t0}ms`);
    return result;
  } catch (e) {
    if (!(e instanceof StallError)) logEvent(stage, "error", String(e).slice(0, 100));
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Retry wrapper: runs withWatchdog up to `attempts` times unless the error is fatal. */
export async function withWatchdogRetry<T>(
  stage: string, ms: number, attempts: number, fn: (signal: AbortSignal) => Promise<T>,
  isFatal: (e: unknown) => boolean = () => false,
): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try { return await withWatchdog(`${stage}#${i}`, ms, fn); }
    catch (e) { last = e; if (isFatal(e)) throw e; }
  }
  throw last;
}
