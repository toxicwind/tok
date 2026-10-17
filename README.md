<div align="right">

[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![ranch](https://img.shields.io/badge/ranch-tok-black?style=for-the-badge)](https://github.com/toxicwind/tok)
[![Bun](https://img.shields.io/badge/bun-1.4.x--canary-f9f1e1?style=for-the-badge&logo=bun)](https://bun.sh)

</div>

# tok

**Standalone fast token counter.** Pure-JS BPE via `gpt-tokenizer` — zero native
deps, zero network at runtime, works anywhere Bun or Node runs. A drop-in for
the estate's `tok` CLI that no longer depends on tau-natives.

## Why standalone

The original `tok` lived inside `tau` and imported a Rust-compiled native
tokenizer. `tok` is good enough to own itself: a self-contained, importable
package + CLI, so any repo can count tokens without a tau build or a Rust
toolchain.

## Install

```bash
# as a dependency
bun add tok@github:toxicwind/tok

# use the CLI
bun run script/tok.ts -- file.txt
# or symlink:  ln -s $PWD/script/tok.ts ~/.local/bin/tok
```

## CLI

```
tok <file> [<file> … <dir> …]   per-file counts + total
tok "some string"               count an inline string
tok --json <dir>                machine-readable output
tok -t 20 <dir>                 top-20 files by tokens
tok -e <model|encoding> <t…>    pick tokenizer family / model (default gpt-4o)
tok --cost <target>             rough $ cost per model family
```

## Import (module)

```ts
import { countTokens, count, encodingFor, TOK_ENCODINGS } from "tok"

countTokens("hello world")                 // → 2 (gpt-4o family)
countTokens("hi", "gpt-4o-mini")           // pick a model
const { tokens, bytes, chars } = count("héllo")
```

Encodings: `o200k_base` (GPT-5/4o/o), `cl100k_base` (GPT-4/3.5), `p50k_base`,
`r50k_base` (GPT-3), `p50k_edit` (code-davinci-edit). Pass any model name or
encoding id via `-e`.

## Test

```bash
bun test
```

## License

MIT — see [LICENSE](LICENSE).