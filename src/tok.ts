/**
 * src/tok.ts — core token-counting module (importable, framework-free).
 *
 * Pure-JS BPE via `gpt-tokenizer` (no native/network). Counts tokens for a wide
 * range of open/current model families. The default is o200k_base — the modern
 * family used by GPT-5/4o/o-series, Claude, Qwen, DeepSeek, Glm, etc. — matching
 * the estate's native `countTokens(text, Encoding.O200kBase)` contract.
 *
 *   import { countTokens } from "tok"
 *   const n = countTokens("hello world")            // o200k_base (modern default)
 *   const n2 = countTokens("hi", "o200k_base")
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

/** Model → encoding map for the modern/relevant families. */
const MODEL_ENCODING: Record<string, EncodingName> = {
  "gpt-4o": "o200k_base",
  "gpt-4o-mini": "o200k_base",
  "gpt-4.1": "o200k_base",
  "gpt-4.1-mini": "o200k_base",
  "gpt-4.1-nano": "o200k_base",
  "gpt-4.5-preview": "o200k_base",
  "gpt-5": "o200k_base",
  "o1": "o200k_base",
  "o3": "o200k_base",
  "o4": "o200k_base",
  "gpt-oss": "o200k_base",
  "chatgpt-4o-latest": "o200k_base",
  "gpt-4": "cl100k_base",
  "gpt-4-turbo": "cl100k_base",
  "gpt-3.5-turbo": "cl100k_base",
  "text-embedding-ada-002": "cl100k_base",
  "code-davinci-002": "p50k_base",
  "gpt-3": "r50k_base",
  "gpt2": "gpt2",
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

/** Token + byte + char summary for a string. */
export function count(text: string, encodingOrModel = "o200k_base") {
  const tokens = countTokens(text, encodingOrModel)
  const bytes = new TextEncoder().encode(text).byteLength
  return { tokens, bytes, chars: text.length, encoding: encodingFor(encodingOrModel) }
}