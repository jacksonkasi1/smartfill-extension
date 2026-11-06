# Template: AGENTS.md

Use this skeleton for the target repo's root `AGENTS.md`. Fill every section from Phase 0 evidence and delete sections that do not apply. Keep it concise (~100 lines); detail belongs in `docs/agents/*`.

The **File Organization & Separation of Concerns** section is portable doctrine — keep it verbatim. Everything else must be rewritten from evidence gathered in the target repo.

---

````md
# AGENTS.md

This file provides guidance for AI coding agents working in this repository.

**This is a living document.** When you make a mistake or learn something new about this codebase, add it to [Lessons Learned](docs/agents/lessons-learned.md). When you coin or clarify a domain term, update [CONTEXT.md](CONTEXT.md) in the same change.

## Quick Links

- [Domain Language](CONTEXT.md)
- [Architecture & Workspace Structure](docs/agents/architecture.md)
- [Code Style & Patterns](docs/agents/code-style.md)
- [Lessons Learned](docs/agents/lessons-learned.md)
- [Design Language](DESIGN.md) <!-- only if the repo has a frontend and a DESIGN.md (see the design-md skill); delete otherwise -->

## <Critical domain sections — only what exists here>

<!-- e.g. Authentication, Database & Migrations, Environment isolation.
     One short paragraph each + key env vars + the one command agents
     must not forget (e.g. "always generate a migration after schema edits"). -->

## Commands

```bash
# Development
<real dev command>

# Quality checks (REQUIRED after making any changes)
<real canonical check script — the one CI runs>

# Linting and formatting
<real commands>

# Testing
<real commands, including single-file invocation>
```
````

**CI/script execution rules:**

- Run project checks through package scripts, not raw tool binaries (`<pm> run ci`, not `npx tsc` / `eslint .`), so local runs match CI.

## Git Commands

<!-- Only real gotchas: e.g. quote paths containing [brackets] in zsh,
     team merge-vs-rebase preference. Delete if none. -->

## Architecture (Summary)

```
<one-line flow diagram>
```

See [Architecture & Workspace Structure](docs/agents/architecture.md) for details.

## File Organization & Separation of Concerns

- Do **not** append new functionality to the bottom of an existing file by default.
- Before adding code, decide whether the behavior is a separate concern that should live in its own file.
- Prefer creating a new colocated file for distinct concerns (components, hooks, utilities, schemas, data-access helpers).
- If a file is already large or handling multiple responsibilities, extract the new logic into focused modules and import them.
- If a change introduces a distinct cluster of state, effects, handlers, or API calls for one feature, treat that as a strong signal to extract it.
- Keep each file focused on one primary responsibility.

## Code Style (Summary)

<!-- 5-8 bullets max: package manager, naming, no-any policy,
     import rules, formatter, validation library. -->

See [Code Style & Patterns](docs/agents/code-style.md) for full conventions.

````

---

After creating `AGENTS.md`, symlink it: `ln -sf AGENTS.md CLAUDE.md`

If symlinks are not viable in the target environment, create `CLAUDE.md` containing only:

```md
See AGENTS.md — single source of truth.
````
