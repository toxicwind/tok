#!/usr/bin/env bun
/**
 * script/tok.ts — `tok` CLI. Counts a file or text across every embedded offline
 * tokenizer and prints a per-encoding stats table (mirrors `tau toks`).
 *
 *   tok <file>              count a file (per-encoding)
 *   tok "some string"       count literal text
 *   tok --json <target>     machine-readable per-encoding output
 *   tok -e <enc|model> <t…> single-encoding count
 */
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { count, toksTable, encodingFor } from "../src/tok.ts"

const args = process.argv.slice(2)
let wantJson = false
let filter: string | undefined
const targets: string[] = []

for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === "--json") { wantJson = true; continue }
  if (a === "-e") { filter = args[++i]; continue }
  if (a === "-h" || a === "--help") {
    console.log(`usage: tok [--json] [-e <enc|model>] <file|text>…`)
    process.exit(0)
  }
  targets.push(a)
}

if (targets.length === 0) {
  console.error("bound: tok requires a file path or text")
  process.exit(1)
}

const input = targets.join(" ")
let source: { kind: string; path?: string; text: string }

try {
  const fp = path.resolve(targets[0])
  if ((await fs.stat(fp)).isFile()) {
    source = { kind: "file", path: targets[0], text: await Bun.file(fp).text() }
  } else {
    source = { kind: "text", text: input }
  }
} catch {
  source = { kind: "text", text: input }
}

const label = source.kind === "file" ? source.path ?? input : "text"

if (filter) {
  const enc = encodingFor(filter)
  const { tokens, bytes, chars } = count(source.text, enc)
  if (wantJson) {
    console.log(JSON.stringify({ source: label, bytes, chars, encoding: enc, tokens }, null, 2))
  } else {
    console.log(`${String(enc).padEnd(18)}${" ".padEnd(16)}${String(tokens).padStart(10)}   (${bytes} bytes, ${chars} chars)`)
  }
  process.exit(0)
}

const { rows, text } = toksTable(source.text)
if (wantJson) {
  console.log(JSON.stringify({ source: label, encodings: rows }, null, 2))
} else {
  console.log(`input  ${label}`)
  console.log(text)
}