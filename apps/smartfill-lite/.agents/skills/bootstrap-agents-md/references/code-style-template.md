# Template: docs/agents/code-style.md

Document the target repo's ACTUAL conventions, verified in Phase 0. Cover only sections that apply; delete the rest. If the repo already has style docs, consolidate or link — never leave two conflicting sources.

---

```md
# Code Style & Patterns

Detailed coding conventions and common patterns for this codebase.

## Package Manager

- <manager + version, from `packageManager` field / lockfile>

## TypeScript Configuration

<!-- Only flags that change how agents must write code, e.g.: -->

- <strict mode, noUncheckedIndexedAccess, verbatimModuleSyntax, module/target>

## Formatting

- <formatter, indent, quote style>
- Run `<real fix command>` before committing

## Naming Conventions

- **Files**: <convention + real example from the repo>
- **Types/Interfaces**: <convention + example>
- **Functions/Variables**: <convention + example>
- **Constants**: <convention + example>

## Imports

- <extension rules (e.g. no `.js` in imports), and why>
- <named vs default export preference>
- <grouping order>
- <type-import policy>

## Types

- <`any` policy — e.g. never use `any`; use `unknown` and narrow>
- <validation library + type derivation pattern, e.g. Zod + `z.infer`>
- <interface vs type preference>

## Error Handling

<!-- Show ONE real pattern from the codebase, e.g.: -->

- <structured error returns vs throwing>
- <safe message extraction pattern>

## Testing

- <runner + import pattern>
- <file naming + colocation convention>

## <Domain-specific patterns — only if present>

<!-- e.g. API route conventions, tool implementation patterns,
     component patterns. One subsection each, with a pointer to a
     canonical example file in the repo. -->
```
