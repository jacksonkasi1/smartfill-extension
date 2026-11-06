# Template: CONTEXT.md

Seed this file at bootstrap time — it is the project's language contract, the third root contract beside `AGENTS.md` (behavior) and `DESIGN.md` (appearance).

**Seeding an existing repo:** extract candidate terms from schema/table names, module and type names, README prose, and existing docs. Then run one interview round (per the `frontier-interview` skill) to confirm the extracted definitions and capture head-only terms — concepts the team uses that the code doesn't show. Skip the round if `docs/agents/skills-config.md` records domain seeding as already done.

**Seeding a greenfield repo:** there is nothing to extract; the interview IS the domain-modeling session.

Rules for the file (enforce via AGENTS.md):

- Definitions are one sentence, declarative, and code-anchored — name the module/table/type that embodies the term when one exists
- Refine definitions in place; never delete a term without noting what replaced it
- Plans that coin or clarify a term update this file in the same change (encoded in the plan-mode skill)
- Reviews flag naming that contradicts this file (encoded in the code-review skill)

---

```md
# CONTEXT.md

The language of this project. A term listed here means exactly this everywhere — in code, docs, plans, and conversation. When you coin or clarify a term, or settle a directional decision, update this file in the same change.

## Glossary

- **<Term>** — <one-sentence definition; anchored to code where possible: see `<path or module>`>
- **<Term>** — <definition>

## Decisions

Directional decisions that shape the language and the system. One line each, newest last.

- <YYYY-MM-DD>: <decision — one-line rationale>
```
