import { test, expect } from "bun:test"
import { countTokens, count, countAll, toksTable, TOK_ENCODINGS, encodingFor, ENCODING_MODELS } from "../src/index.ts"

test("counts known token counts (o200k_base default)", () => {
  expect(countTokens("hello world")).toBeGreaterThan(0)
  expect(countTokens("Hello, world!")).toBeGreaterThan(0)
  // classic gpt-4o "hello world" = 2 tokens
  expect(countTokens("hello world")).toBe(2)
})

test("o200k vs cl100k differ appropriately", () => {
  const s = "The quick brown fox jumps over the lazy dog, repeatedly, for science. "
  const o = countTokens(s, "o200k_base")
  const c = countTokens(s, "cl100k_base")
  expect(typeof o).toBe("number")
  expect(typeof c).toBe("number")
  expect(o).toBeGreaterThan(0)
  expect(c).toBeGreaterThan(0)
})

test("count returns bytes + chars", () => {
  const r = count("héllo", "o200k_base")
  expect(r.bytes).toBe(6) // h é l l o → 6 bytes (é = 2)
  expect(r.chars).toBe(5)
  expect(r.encoding).toBe("o200k_base")
})

test("TOK_ENCODINGS covers the OpenAI/GPT families", () => {
  expect(TOK_ENCODINGS).toContain("o200k_base")
  expect(TOK_ENCODINGS).toContain("cl100k_base")
  expect(TOK_ENCODINGS).toContain("p50k_base")
  expect(TOK_ENCODINGS).toContain("gpt2")
  expect(ENCODING_MODELS.o200k_base).toContain("GPT-4o")
})

test("countAll returns per-encoding rows", () => {
  const r = countAll("hello world")
  expect(r.encodings.length).toBe(TOK_ENCODINGS.length)
  for (const row of r.encodings) expect(row.tokens).toBeGreaterThan(0)
})

test("toksTable shapes the per-encoding table", () => {
  const { rows, text } = toksTable("hello world")
  expect(rows.length).toBe(TOK_ENCODINGS.length)
  expect(text).toContain("o200k_base")
  expect(text).toContain("chars/tok")
})

test("encodingFor resolves model names + encoding ids", () => {
  expect(encodingFor("gpt-4o")).toBe("o200k_base")
  expect(encodingFor("gpt-3.5-turbo")).toBe("cl100k_base")
  expect(encodingFor("cl100k_base")).toBe("cl100k_base")
  expect(encodingFor("unknown-model")).toBe("o200k_base")
})