/**
 * src/tok.ts — core token-counting module. STANDALONE, pure-JS (no native dep).
 *
 * Uses `gpt-tokenizer` (pure-JS BPE + bundled vocab, zero network). Covers the
 * OpenAI/GPT families (o200k/cl100k/p50k/r50k/gpt2). Deliberately avoids the
 * tau N-API native, which segfaults this canary Bun when dlopen'd cross-cwd —
 * tok must work anywhere without a build/toolchain.
 *
 * Importable as a dependency AND runnable as the `tok` CLI (script/tok.ts).
 */
import { resolveEncoding } from "gpt-tokenizer/esm/resolveEncoding.js"
import { encode } from "gpt-tokenizer/esm/encoding/o200k_base.js"
import type { EncodingName } from "gpt-tokenizer/esm/mapping.js"

/** Recognized encoding families. Modern default first (o200k_base). */
export const TOK_ENCODINGS: EncodingName[] = [
  "o200k_base", // GPT-5, GPT-4o, o-series, gpt-oss, chatgpt-4o-latest
  "cl100k_base", // GPT-4, GPT-3.5-turbo
  "p50k_base", // code-davinci-002
  "r50k_base", // GPT-3
  "gpt2", // GPT-2
]

export type TokEncoding = EncodingName

/** Display metadata per encoding. */
export const ENCODING_MODELS: Record<string, string> = {
  o200k_base: "GPT-4o · o1 · GPT-5+",
  cl100k_base: "GPT-3.5 · GPT-4",
  p50k_base: "code-davinci-002",
  r50k_base: "GPT-3",
  gpt2: "GPT-2",
}

const MODEL_ENCODING: Record<string, EncodingName> = {
  "gpt-4o": "o200k_base", "gpt-4o-mini": "o200k_base", "gpt-4.1": "o200k_base",
  "gpt-4.1-mini": "o200k_base", "gpt-4.1-nano": "o200k_base", "gpt-4.5-preview": "o200k_base",
  "gpt-5": "o200k_base", o1: "o200k_base", o3: "o200k_base", o4: "o200k_base",
  "gpt-oss": "o200k_base", "chatgpt-4o-latest": "o200k_base",
  "gpt-4": "cl100k_base", "gpt-4-turbo": "cl100k_base", "gpt-3.5-turbo": "cl100k_base",
  "text-embedding-ada-002": "cl100k_base", "code-davinci-002": "p50k_base",
  "gpt-3": "r50k_base", gpt2: "gpt2",
}

/** Resolve a stable encoding name from a model name or encoding id. Unknown → o200k_base. */
export function encodingFor(modelOrEncoding: string): EncodingName {
  const k = modelOrEncoding.toLowerCase()
  if ((TOK_ENCODINGS as string[]).includes(k)) return k as EncodingName
  return MODEL_ENCODING[k] ?? "o200k_base"
}

/** Count tokens in a string. Pass an encoding id (e.g. "o200k_base") or a model name. */
export function countTokens(text: string, encodingOrModel = "o200k_base"): number {
  const enc = encodingFor(encodingOrModel)
  if (enc === "o200k_base") return encode(text).length
  return encode(text, resolveEncoding(enc)).length
}

/** Token + byte + char summary for a string (single encoding). */
export function count(text: string, encodingOrModel = "o200k_base") {
  const tokens = countTokens(text, encodingOrModel)
  const bytes = new TextEncoder().encode(text).byteLength
  return { tokens, bytes, chars: text.length, encoding: encodingFor(encodingOrModel) }
}

/** Per-encoding table rows (mirrors `tau toks` output shape for the families we cover). */
export function toksTable(text: string) {
  const bytes = new TextEncoder().encode(text).byteLength
  const chars = text.length
  const rows = TOK_ENCODINGS.map((encoding) => ({
    encoding,
    name: encoding,
    models: ENCODING_MODELS[encoding] ?? "",
    tokens: countTokens(text, encoding),
  }))
  const baseline = rows.find((r) => r.encoding === "o200k_base")?.tokens ?? 0
  const fmt = (x: number) => x.toLocaleString("en-US")
  const out = [
    `size     ${fmt(bytes)} bytes · ${fmt(chars)} chars`,
    ``,
    `${"encoding".padEnd(18)}${"models".padEnd(22)}${"tokens".padStart(10)}${"chars/tok".padStart(11)}${"vs o200k".padStart(10)}`,
  ]
  for (const r of rows) {
    const ratio = r.tokens > 0 ? (chars / r.tokens).toFixed(2) : "—"
    const delta =
      r.encoding === "o200k_base" || baseline === 0
        ? "—"
        : `${r.tokens >= baseline ? "+" : ""}${(((r.tokens - baseline) / baseline) * 100).toFixed(1)}%`
    out.push(`${r.name.padEnd(18)}${r.models.padEnd(22)}${fmt(r.tokens).padStart(10)}${ratio.padStart(11)}${delta.padStart(10)}`)
  }
  return { rows, text: out.join("\n") }
}

/** Count across every covered encoding, per-encoding rows. */
export function countAll(text: string) {
  const bytes = new TextEncoder().encode(text).byteLength
  const encodings = TOK_ENCODINGS.map((encoding) => ({
    encoding,
    name: encoding,
    models: ENCODING_MODELS[encoding] ?? "",
    tokens: countTokens(text, encoding),
  }))
  return { bytes, chars: text.length, encodings }
}