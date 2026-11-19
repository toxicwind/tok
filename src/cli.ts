/**
 * whole/src/cli.ts — the whole command surface.
 *
 *   whole <file>            read first PAGE lines (sequential, enforced)
 *   whole <file> --next     next PAGE lines (resumes from state)
 *   whole <file> --all      dump the whole file (no footer)
 *   whole <file> /first     reset to line 1
 *   cat x | whole           dump everything (stdin, not stateful)
 *   cat x | whole --pages   page stdin 20 at a time
 *   whole --gc              prune stale state now
 *   whole --poll [interval] auto-sync: prune every N seconds (default 3600)
 */
import { readFileSync } from "node:fs";
import { isatty } from "node:tty";
import { readFileSync as _rf } from "node:fs";
import { pageLines, printAll, PAGE } from "./pager.ts";
import {
  acquireLock,
  fileIdent,
  loadState,
  releaseLock,
  saveState,
  stateKey,
  type ProgressEntry,
} from "./state.ts";

/** Prune stale entries now. Returns count removed. */
export function gc(): number {
  if (!acquireLock()) return -1;
  try {
    const st = loadState();
    const before = Object.keys(st).length;
    saveState(st); // saveState prunes
    return before - Object.keys(loadState()).length;
  } finally {
    releaseLock();
  }
}

/** Auto-sync loop: gc() every `interval` seconds until SIGINT/SIGTERM. */
export function poll(interval = 3600): void {
  const stop = () => process.exit(0);
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  for (;;) {
    try {
      const removed = gc();
      console.log(
        `[whole-poll] ${new Date().toISOString()} pruned=${removed}`,
      );
    } catch (e) {
      console.error(`[whole-poll] error: ${(e as Error).message}`);
    }
    Bun.sleepSync(interval * 1000);
  }
}

export function run(argv: string[]): void {
  // utility modes (no file)
  if (argv[0] === "--gc") {
    const n = gc();
    console.log(n >= 0 ? `pruned ${n}` : "could not acquire lock");
    return;
  }
  if (argv[0] === "--poll") {
    const interval = argv[1] ? Number(argv[1]) || 3600 : 3600;
    poll(interval);
    return;
  }

  // stdin mode
  const isPipe = argv[0] === "-" || (!isatty(0) && argv.length === 0);
  if (isPipe || argv[0] === "--pages") {
    const data = _rf(0, "utf8");
    const lines = data.split("\n");
    if (argv[0] === "--pages") {
      for (let i = 1; i <= lines.length; i += PAGE) {
        pageLines(lines, i, PAGE, "<stdin>");
      }
    } else {
      printAll(lines);
    }
    return;
  }

  const fpath = argv[0];
  if (!fpath) {
    console.log(
      "usage: whole <file> [--next|--all|/first] | whole --gc | whole --poll [interval]",
    );
    return;
  }
  let lines: string[];
  try {
    lines = readFileSync(fpath, "utf8").split("\n");
  } catch {
    console.error(`whole: no such file: ${fpath}`);
    process.exit(1);
  }
  const ident = fileIdent(fpath);
  const key = stateKey(fpath);

  if (!acquireLock()) {
    console.error("whole: could not acquire lock (another whole running?)");
    process.exit(1);
  }
  try {
    const st = loadState();
    let prev: ProgressEntry | undefined = st[key];
    // changed file → resume fresh
    if (prev && prev.ident && ident && prev.ident.mtime !== ident.mtime) {
      prev = undefined;
    }
    let offset = 1;
    let page = PAGE;
    const rest = argv.slice(1);
    if (rest[0] === "--all") {
      offset = 1;
      page = Number.MAX_SAFE_INTEGER;
    } else if (rest[0] === "--next") {
      offset = prev?.next ?? 1;
      page = prev?.page ?? PAGE;
    } else if (rest[0] === "/first") {
      offset = 1;
    }

    // sequential enforcement
    const alreadyRead = offset > 1;
    if (alreadyRead && !argv.includes("--next") && !argv.includes("--all") && !argv.includes("/first")) {
      console.log("=".repeat(60));
      console.log(">>> BLOCKED: YOU MUST RUN --next to continue reading this file sequentially <<<");
      console.log(">>> (or /first to restart, or --all to dump everything) <<<");
      console.log(">>> This file is partway read. You are NOT done. Continuing is MANDATORY. <<<");
      console.log("=".repeat(60));
      return;
    }

    const res = pageLines(lines, offset, page, fpath);
    st[key] = {
      next: res.next,
      page,
      total: res.total,
      ident: ident ?? { mtime: 0, size: 0 },
      path: fpath,
      touched: Date.now() / 1000,
    };
    saveState(st);
  } finally {
    releaseLock();
  }
}