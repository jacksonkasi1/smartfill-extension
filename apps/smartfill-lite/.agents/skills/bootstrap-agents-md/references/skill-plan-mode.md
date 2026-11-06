# Portable skill: plan-mode

Install as `.agents/skills/plan-mode/SKILL.md` in the target repo (or the repo's equivalent skills directory). Create the content below verbatim — it is doctrine, not product-specific.

---

```md
---
name: plan-mode
description: Holistic, system-aware planning before implementing non-trivial tasks. Use when the task involves new features, architectural decisions, multi-file changes, unclear requirements, or multiple valid approaches. Triggers on "/plan", "plan this", "design an approach", "let's plan first".
---

For non-trivial implementation tasks, plan before you code. Treat every change as a system change, not an isolated patch. Find the smallest implementation that remains coherent with the architecture, lifecycle, and future evolution of the system.

## Planning Doctrine

- **Think broadly, implement narrowly.** Analyze the surrounding system before deciding where the change belongs.
- **Every change has system implications.** Consider data flow, ownership of state, interfaces, lifecycle, failure modes, and future extension.
- **Prefer authoritative, derivable designs.** If state can be derived from persisted state or existing abstractions, prefer that over inventing transient duplicates.
- **Choose the smallest coherent solution.** Do not default to the smallest local patch if it distorts the architecture.
- **Expand scope only when it simplifies the system.** Not for speculative improvement.
- **Keep the language current.** When a plan coins or clarifies a domain term, or settles a directional decision, update `CONTEXT.md` in the same change.

## Steps

1. **Explore.** Read relevant files; trace the end-to-end flow; identify the current source of truth, state ownership, and lifecycle (trigger, processing, completion, failure, retry, cleanup). Search for prior art. Do not implement yet.
2. **Clarify.** Ask the user about ambiguities — behavior, edge cases, failure handling, tradeoffs — before committing to an approach.
3. **Design.** Compare the most direct implementation against the most system-coherent one. Answer explicitly: What is the source of truth before/after? What new state or invariants does this introduce? Does it duplicate logic anywhere? What is the smallest solution that keeps the system coherent?
4. **Review.** Re-read the critical files your design depends on to verify assumptions. Confirm the design covers loading, in-progress, completion, failure, retry, and cleanup.
5. **Present.** Write the plan (structure per `docs/plans/README.md`) to `PLAN.md` or `docs/plans/<feature>.md` and wait for approval.
6. **Implement and verify.** Track progress per item, then run the plan's verification steps.
```
