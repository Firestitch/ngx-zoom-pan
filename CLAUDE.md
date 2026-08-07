<!-- >>> specify-mcp managed >>> -->
<!-- Managed by @firestitch/specify-mcp. Edits inside this block are overwritten on the
     next MCP start. Put your own instructions in CLAUDE.local.md. -->

## CRITICAL: Read the standards before writing code

Two separate bodies of guidance that do not overlap. Load from the right one.

### Codebase standards → `standards/`

Angular, PHP, database, and cross-cutting rules. Plain files on disk in the `standards/`
submodule — read them directly, no tool involved.

1. **Read `standards/index.json`.** Every folder carries a `when:` clause saying when it
   applies. Load the folder indexes whose `when:` matches your task; skip the rest. Trust
   `when:` over the folder name — one corpus serves several repos, so a folder whose `when:`
   names files this repo does not contain does not apply, however apt its title sounds.
2. **Always read `standards/general/index.json`** when touching code. It is cross-cutting.
3. **Match keywords** in each loaded index against the work at hand.
4. **Read the full `.md` files** for every match **before your first edit.** An `index.json`
   is a map, not the content — reading one does not count as reading a standard.

Full-stack work — new features, related-object wiring, shared API contract changes — needs
**general + php + angular** at minimum. When in doubt, load more rather than less.

If nothing applies (a typo in a string, a question about the codebase), say so in one
sentence and proceed.

**Adding a standard:** `general/` for cross-cutting rules, the language or domain folder for
scoped ones. Match the structure of the files already there (title, rule, good and bad
examples, notes) and add an entry to that folder's `index.json` with a clear description and
generous keywords so it can be found.

### Driving the Specify MCP → its own tools

How to use the MCP itself — tasks, components, testcases, time, the PR workflow, SDLC — is
baked into the MCP package rather than `standards/`, so it can never drift from the tools it
documents. Call `specify_guide_index` to route, then `specify_guide_read` the matching file
before your first write. Use `specify_search_knowledge` when the index does not obviously
route. Do not look for MCP guidance in `standards/`; it is not there.

### Keeping `standards/` current

The Specify MCP fast-forwards the submodule in the background on every start, so it is
normally already current. Without the MCP, refresh it the same way as any other submodule:

```
git submodule update --remote --merge standards
```

## Project and personal instructions

@CLAUDE.local.md

Anything this repo or you personally need goes in `CLAUDE.local.md`. It is gitignored, and
neither the MCP nor anything else overwrites it.
<!-- <<< specify-mcp managed <<< -->
