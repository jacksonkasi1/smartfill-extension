# SmartFill Lite

A lightweight, standalone version of SmartFill. No authentication, no
backend, no knowledge base — just the form-filling flow you actually need.

## What it does

```
Open extension
  ↓
Optional user context / instructions
  ↓
Detect fields on current page
  ↓
Send fields + context to selected AI model
  ↓
Receive structured values
  ↓
Fill the form
```

The only network request the fill operation makes is the single call to
the user's chosen AI provider (Gemini, Groq, or OpenRouter). API keys
are stored locally with `chrome.storage.sync`.

## Quick start

```bash
# from the monorepo root
bun install

# dev
cd apps/smartfill-lite
bun run dev

# build (outputs to apps/smartfill-lite/build/chrome-mv3-prod)
bun run build
```

Then load `build/chrome-mv3-prod` as an unpacked extension in Chrome
(`chrome://extensions` → Developer mode → Load unpacked).

## Configuration

Open the extension → Settings, then choose:

- **AI Provider** — Gemini, Groq, or OpenRouter
- **Model** — a recommended one for that provider, or paste a custom ID
- **API Key** — stored locally in `chrome.storage.sync`

## Custom instructions

The main popup has a *Custom Instructions* textarea. Whatever you type
there is sent to the AI as the primary source of truth for every field
on the page. Leave it empty to let the AI fall back to field labels,
placeholders, and the available options.

Example:

```
My name is Jackson Kasi.
I am a software developer from Chennai.
Use jackson@example.com as my email.
I have 5 years of TypeScript experience.
```

## Architecture notes

This is a Plasmo-based Chrome extension (MV3). The detection and fill
pipeline is intentionally minimal:

- `src/lib/detection/formDetection.ts` — single-pass detection with
  set-based deduplication and no fixed React wait
- `src/api/ai/*` — provider calls (Gemini, Groq, OpenRouter) and the
  context-priority prompt + sensitive-field guard
- `src/lib/filling/*` — the per-field fill logic (text, select, radio,
  checkbox)
- `src/content.ts` — the only place that orchestrates the fill flow,
  including the dev-only performance log
- `src/popup.tsx` — the popup UI (no `ClerkProvider`, no RAG block)
- `src/background.ts` — minimal message router

## What was removed (vs. the prior build)

- `@clerk/chrome-extension` package, `ClerkProvider`, sign-in / sign-out UI
- The RAG client (`src/api/rag`, `src/services/rag`) and all
  knowledge-base calls
- The RAG settings UI (knowledge tags, auto-RAG toggle, etc.)
- The fixed 2-second React wait and the 300/500 ms status delays
- Synthetic `<form>` injection during detection
- All `axios` usage (replaced with `fetch`)

The recording / playback feature is preserved for parity.

## Performance instrumentation

In dev builds, the content script logs timings after each fill:

```
[SmartFill]

Fields: 22
Detection: 43ms
AI request: 620ms
Fill: 27ms
Total: 693ms
```

These are `console.log` only — they never block the UI or the network.
