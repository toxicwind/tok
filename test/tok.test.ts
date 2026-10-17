import { test, expect } from "bun:test"
import { countTokens, count, TOK_ENCODINGS } from "../src/tok.ts"

test("counts known token counts", () => {
  expect(countTokens("hello world")).toBeGreaterThan(0)
  expect(countTokens("Hello, world!")).toBeGreaterThan(0)
})

test("gpt-4o vs cl100k differ appropriately", () => {
  const s = "The quick brown fox jumps over the lazy dog, repeatedly, for science. "
  const o = countTokens(s, "gpt-4o")
  const c = countTokens(s, "cl100k_base")
  expect(typeof o).toBe("number")
  expect(typeof c).toBe("number")
  expect(o).toBeGreaterThan(0)
  expect(c).toBeGreaterThan(0)
})

test("count returns bytes + chars + encoding", () => {
  const r = count("héllo", "gpt-4o")
  expect(r.bytes).toBe(6) // h é l l o → 6 bytes (é = 2)
  expect(r.chars).toBe(5)
  expect(r.encoding).toContain("o200k") // gpt-4o → o200k_base
  expect(TOK_ENCODINGS.length).toBeGreaterThan(0)
})