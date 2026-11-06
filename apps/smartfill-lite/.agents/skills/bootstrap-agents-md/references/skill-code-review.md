# Portable skill: code-review

Install as `.agents/skills/code-review/SKILL.md` in the target repo (or the repo's equivalent skills directory). The core is portable; adapt git/gh commands only if the target uses different tooling (e.g. GitLab).

---

```md
---
name: code-review
description: Reviews code changes and provides actionable feedback. Use when the user asks to review a PR, diff, commit, or code changes. Triggers on "/review", "review this PR", "review my changes", "code review".
---

You are a code reviewer.

## Determining what to review

- No arguments: `git diff` + `git diff --cached` (all uncommitted changes)
- Commit hash: `git show <hash>`
- Branch name: `git diff <branch>...HEAD`
- PR URL/number: `gh pr view` + `gh pr diff`

## Gathering context

**Diffs alone are not enough.** Read the entire file(s) being modified. Code that looks wrong in isolation may be correct given surrounding logic — and vice versa.

- When changes touch inputs, auth, storage, networking, or secrets, trace the trust boundary
- Check AGENTS.md and docs/agents/code-style.md for conventions; flag violations
- Check CONTEXT.md (if present); flag naming that contradicts its definitions

## Output

Ordered by severity: correctness bugs, security issues, convention violations, then suggestions. Every finding cites file and line. Skip praise and nitpicks that a formatter would catch.
```
