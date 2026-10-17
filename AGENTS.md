# AGENTS.md — tok component contract

> **Refines:** `/home/toxic/estate/AGENTS.md` (the estate control-plane). Asserts
> **"refines, never contradicts"** the estate contract above it.

## Mission

`tok` is the estate's standalone fast token counter. Pure-JS BPE via
`gpt-tokenizer` — zero native deps, zero network at runtime. Provides an
importable `countTokens(text, encoding)` contract (matching the tiktoken shim
need) and a `tok` CLI that prints a per-encoding stats table.

## Key files

| Path | Owns |
|---|---|
| `src/tok.ts` | `countTokens`/`count`/`countAll`/`toksTable`/`encodingFor` |
| `src/index.ts` | public entrypoint exports |
| `script/tok.ts` | the `tok` CLI (thin shell over `src/tok.ts`) |
| `test/tok.test.ts` | behavior (7 tests) |

## Rules

- **Standalone by design.** Deliberately no dependency on the tau-native N-API
  (it segfaults this canary bun on `dlopen` cross-cwd). `gpt-tokenizer` stays
  pure-JS so tok works anywhere without a build/toolchain.
- **The default encoding is `o200k_base`** — the modern family for GPT-5/4o/o.
  Pass an encoding id (`cl100k_base`) or a model name (`gpt-4o-mini`).
- **Never truncate search output.** Use ffs/ast-grep with the tool's own paging
  (`--limit`), never `| head`/`tail`.
- **Import + CLI share one core.** All logic lives in `src/tok.ts`; the CLI is a
  thin wrapper so the module stays dependency-importable.

## Gate

```bash
bun test          # 7/7 behavior tests
node ../agent-customization-style-guide/bin/validate.js   # R-502 convention gate
```

Follow the **vibe meta-todo** (estate AGENTS.md): race faster with borrow +
papers during the task; after research spawn the next 6 complex todos.