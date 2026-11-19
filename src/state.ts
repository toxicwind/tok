/**
 * whole/src/state.ts — race-free, identity-aware, self-pruning progress store.
 *
 * Ported from rl.py (Python) to Bun/TypeScript with the same hardening:
 *  - state key = sha1 of the canonical path (opaque, stable, never collides)
 *  - each entry stores a file identity (mtime+size) so a CHANGED file resumes
 *    fresh instead of from a misaligned stale position
 *  - read-modify-write is guarded by a cross-process lock (atomic mkdir) and
 *    written via atomic rename (temp + rename) so concurrent invocations or an
 *    interrupt never tear/corrupt the state file
 *  - entries are pruned when the file no longer exists OR hasn't been touched
 *    in PRUNE_AGE (24h)
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const STATE_FILE = resolve(
  process.env.WHOLE_STATE_FILE ?? join(tmpdir(), "whole-state.json"),
);
const LOCK_DIR = `${STATE_FILE}.lock`;
export const PRUNE_AGE = 24 * 3600; // 24h in seconds

export interface ProgressEntry {
  /** 1-based line to resume at */
  next: number;
  page: number;
  total: number;
  /** file identity captured at read time */
  ident: { mtime: number; size: number };
  path: string;
  /** unix epoch of last touch */
  touched: number;
}

export type State = Record<string, ProgressEntry>;

/** Opaque, stable state key = sha1 of the canonical absolute path. */
export function stateKey(fpath: string): string {
  return createHash("sha1").update(resolve(fpath)).digest("hex");
}

/** Identity of a file (mtime+size) so a changed file is detected, not resumed. */
export function fileIdent(fpath: string): { mtime: number; size: number } | null {
  try {
    const st = statSync(fpath);
    return { mtime: st.mtimeMs, size: st.size };
  } catch {
    return null;
  }
}

/** Cross-process lock: atomic mkdir (O_EXCL semantics). Spins briefly. */
export function acquireLock(timeoutMs = 2000): boolean {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      mkdirSync(LOCK_DIR);
      return true;
    } catch {
      if (Date.now() > deadline) return false;
      Bun.sleepSync(10);
    }
  }
}

export function releaseLock(): void {
  try {
    rmdirSync(LOCK_DIR);
  } catch {
    /* already gone */
  }
}

export function loadState(): State {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
  } catch {
    return {};
  }
}

/** Atomic write: temp file in same dir, then rename (os.replace semantics). */
export function saveState(s: State): void {
  // Prune: drop entries whose file is gone OR untouched past PRUNE_AGE.
  const now = Date.now() / 1000;
  for (const [k, v] of Object.entries(s)) {
    if (!existsSync(v.path)) {
      delete s[k];
    } else if (now - v.touched > PRUNE_AGE) {
      delete s[k];
    }
  }
  const dir = dirname(STATE_FILE);
  const tmp = join(dir, `.whole-state-${process.pid}-${Date.now()}.tmp`);
  writeFileSync(tmp, JSON.stringify(s, null, 2), "utf8");
  renameSync(tmp, STATE_FILE);
}