#!/usr/bin/env bun
/**
 * whole CLI — read files to the END, no skipping.
 *
 *   whole <file>            read first 20 lines (sequential, enforced)
 *   whole <file> --next     next 20 lines (resumes from state)
 *   whole <file> --all      dump the whole file
 *   whole <file> /first     reset to line 1
 *   cat x | whole           dump everything (stdin)
 *   cat x | whole --pages   page stdin 20 at a time
 *   whole --gc              prune stale state now
 *   whole --poll [interval] auto-sync prune loop
 */
import { run } from "./src/cli.ts";

run(process.argv.slice(2));