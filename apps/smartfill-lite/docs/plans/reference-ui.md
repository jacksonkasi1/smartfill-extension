# Reference UI revision

5 November 2026. User authorized implementation and supplied screenshots, the model-picker reference URL and theme guidance. This revision supersedes the previous plan's blue accent and restricted-pill rules.

## Todo

- [x] Install design-md, setup and bootstrap-agents-md locally for Codex.
- [x] Read skills; bootstrap project agent docs using existing evidence and settled direction.
- [x] Inspect the public reference, fonts, actual CSS dimensions and screenshot patterns.
- [x] Apply monochrome semantic background/foreground tokens and a locally bundled Geist font.
- [x] Build one reusable selection picker, including search, keyboard operation and custom model IDs.
- [x] Apply the reference treatment to popup, recorder, settings, saved forms and overlays.
- [x] Merge design documentation and preserve prior behavioral contracts.
- [x] Verify production browser flows, viewport bounds, font loading and screenshots.
- [x] Run final checks and record results.

## Design choices

Keep React/Plasmo and plain CSS. The existing theme and storage remain the source of truth; no new UI framework or backend is necessary. The dropdown's only temporary state is open/search/active position. The caller continues owning persisted values. Premium source is not copied or bypassed; build the observed interaction from original code. No invented model price/window/effort metadata.

## Validation

`bun run typecheck`, `bun run test`, `bun run build`, then the local fixture's `tests/e2e/ui-review.cjs`. Check custom provider/model controls, popup limits, keyboard cancellation, light/dark appearance, pin persistence, real content-script fill/undo and picker cancellation. Existing credentials are not used. Live AI/voice/permission checks remain a documented limit.

Completed: TypeScript passed; existing suite 178 passed, 0 failed, 410 assertions; production build passed. The browser review passed in Chromium for both appearances, 380×600 popup bounds, narrow settings, searchable options, exact-case custom model IDs, asynchronous model-list focus, mode switching, fill/regenerate/undo, failed-scan Undo, saved-value pin persistence and content-script picker cancellation. No page errors. Local Geist was confirmed loaded. Screenshots are under `docs/ui/`.

Read-only integration review found exact-case custom-ID suppression and stale active indices after asynchronous option replacement; both were corrected and covered in the browser review. This remains a fixture review, not a claim that installed-extension permissions or live providers were exercised.
