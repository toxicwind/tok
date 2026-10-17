#!/usr/bin/env bun
/**
 * script/tok.ts — `tok` CLI. Thin shell over src/tok.ts (the importable core).
 *
 * Usage (matches the estate tok ergonomics):
 *   tok <file> [<file> … <dir> …]   per-file counts + total
 *   tok "some string"               count an inline string
 *   tok --json <dir>                machine-readable
 *   tok -t 20 <dir>                 top-20 by tokens
 *   tok -e <model|encoding> <t…>    pick tokenizer family / model
 *   tok --cost <target>             rough $ cost per model family
 */
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { countTokens } from "../src/tok.ts"

const args = process.argv.slice(2)
let encoding = "gpt-4o"
let wantJson = false
let topN = 0
let wantCost = false
const targets: string[] = []

for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === "--json") { wantJson = true; continue }
  if (a === "--cost") { wantCost = true; continue }
  if (a === "-t") { topN = Number(args[++i]) || 0; continue }
  if (a === "-e") { encoding = args[++i] ?? "gpt-4o"; continue }
  if (a === "-h" || a === "--help") {
    console.log(`usage: tok [-e <model>] [-t N] [--json] [--cost] <file|dir|string>…`)
    process.exit(0)
  }
  targets.push(a)
}

async function collectFiles(target: string): Promise<string[]> {
  try {
    const st = await fs.stat(target)
    if (st.isFile()) return [target]
    if (st.isDirectory()) {
      const out: string[] = []
      async function walk(d: string): Promise<void> {
        const ents = await fs.readdir(d, { withFileTypes: true })
        for (const e of ents) {
          const p = path.join(d, e.name)
          if (e.isDirectory()) await walk(p)
          else if (e.isFile()) out.push(p)
        }
      }
      await walk(target)
      return out
    }
  } catch {}
  return []
}

interface Row { path: string; tokens: number; bytes: number; chars: number; error?: string }
const results: Row[] = []
let hadError = false

for (const t of targets) {
  const files = await collectFiles(t)
  if (files.length === 0) {
    const bytes = new TextEncoder().encode(t).byteLength
    results.push({ path: "<string>", tokens: countTokens(t, encoding), bytes, chars: t.length })
    continue
  }
  for (const f of files) {
    try {
      const raw = await fs.readFile(f, "utf8")
      results.push({ path: f, tokens: countTokens(raw, encoding), bytes: Buffer.byteLength(raw), chars: raw.length })
    } catch (e) {
      hadError = true
      results.push({ path: f, tokens: 0, bytes: 0, chars: 0, error: String(e) })
    }
  }
}

const totalTokens = results.reduce((s, r) => s + r.tokens, 0)
const totalBytes = results.reduce((s, r) => s + r.bytes, 0)
const totalChars = results.reduce((s, r) => s + r.chars, 0)

if (wantJson) {
  console.log(JSON.stringify({ encoding, files: results, total: { tokens: totalTokens, bytes: totalBytes, chars: totalChars } }))
  if (hadError) process.exitCode = 1
  process.exit(0)
}

const sorted = [...results].sort((a, b) => b.tokens - a.tokens)
const shown = topN > 0 ? sorted.slice(0, topN) : sorted
for (const r of shown) {
  const label = r.error ? `${r.path}  (${r.error})` : r.path
  console.log(`${String(r.tokens).padStart(6)}  ${label}`)
}
if (topN > 0 && sorted.length > topN) console.log(`${"...".padStart(6)}  (${sorted.length - topN} more files)`)
if (results.length > 1) console.log(`${"-".repeat(8)}  \n${String(totalTokens).padStart(6)}  TOTAL  (${results.length} files, ${totalBytes} bytes, ${totalChars} chars)`)
if (wantCost && results.length) {
  const price = { "gpt-4o": 2.5, "o200k_base": 2.5, "cl100k_base": 10 } as Record<string, number>
  console.log(price[encoding] ? `~$${((totalTokens / 1e6) * price[encoding]).toFixed(4)} to ingest ($${price[encoding]}/Mtok in, ${encoding})` : `(no price table for ${encoding})`)
}
if (hadError) process.exitCode = 1