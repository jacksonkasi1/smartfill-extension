# Template: docs/agents/architecture.md

Write this AFTER Phase 0 evidence gathering. Every claim must trace to something observed in the target repo. Do not invent a monorepo/sandbox architecture if the project is different.

Cover:

- The real system map: apps, packages, primary data/control flow (one diagram)
- Key boundaries and ownership of state
- Workspace/directory layout
- Subsystems an agent must understand before changing code

---

```md
# Architecture

<One sentence: what kind of project this is (monorepo/single app, framework, purpose).>

## Core Flow
```

<primary data/control flow diagram, e.g. Client -> API -> Database>

```

1. **<Layer 1>** — <responsibility, key entry point files>
2. **<Layer 2>** — <responsibility, key entry point files>
3. **<Layer 3>** — <responsibility, key entry point files>

## Key Packages / Modules

- **<path>** — <what it owns; the boundary it enforces>
- **<path>** — <what it owns; the boundary it enforces>

## <Important patterns — only if they exist>

<!-- e.g. subagent delegation, job queues, event flows, caching layers.
     Name the pattern, where it lives, and the invariant an agent must
     preserve when touching it. -->

## Workspace Structure

```

<real directory tree, apps/packages level, 10-15 lines max>

```

```
