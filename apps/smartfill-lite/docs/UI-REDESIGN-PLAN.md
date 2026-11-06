# SmartFill UI system — A–Z implementation plan

Date: 5 November 2026

Reference revision: [reference-ui.md](plans/reference-ui.md) and [DESIGN.md](../DESIGN.md) supersede the original visual measurements and blue-accent/pill restrictions below. The original checklist remains the historical implementation record.

## Outcome and reference

Rebuild the extension's interface as one reusable system: calm neutral surfaces, clear text, deliberate spacing, compact controls, and one restrained blue accent. The supplied reference illustrates consistency and hierarchy; its sample instruction text is reference content, not a feature requirement. Content Reel is an inspiration for simplicity, not a dependency or exact copy.

Remove decorative gradients, colored page glows, glass blur, gradient lettering, exaggerated shadows, inconsistent pills, arbitrary fractional font sizes, and separate visual languages. Support light and dark system appearance with equivalent hierarchy. Keep the existing SmartFill identity and functionality.

## A–Z requirements and todo

- [x] **A — Audit.** Inspect popup, settings, saved-value editor, recorder, picker, notifications, storage and test harness. Existing local changes must survive.
- [x] **B — Base tokens.** Establish a single token source consumable by React pages and the injected shadow root. Semantic tokens cover canvas, surface, subtle surface, border, text, secondary text, accent, focus, success, warning and danger.
- [x] **C — Colors.** Light: off-white canvas, white surface, neutral gray subtle surface, charcoal text, accessible muted text. Dark: charcoal canvas, raised neutral surfaces, near-white text. One blue accent reserved for primary action, focus and selected state. Status colors only communicate meaning.
- [x] **D — Dimensions.** Four-pixel spacing rhythm (4/8/12/16/20/24/32/40/48). Controls 36px; compact icons 32px; primary popup action 40px. Shared border 1px, control radius 8px, card radius 12px. Pills only for small status/count badges.
- [x] **E — Elements.** Reusable Button, IconButton, Field, Section, Badge and segmented control primitives, retaining native HTML semantics and forwarded native attributes.
- [x] **F — Fonts.** Local system font stack; body 13px/20px, supporting copy 12px/18px, section headings 14px/20px semibold, popup title 16px, settings title 24px. Regular and semibold weights. No remote font dependency.
- [x] **G — Grid.** Popup 360px with 16px inset. Settings centered shell with a small navigation column and readable main content, collapsing to horizontal navigation at narrow widths. Shared 16–24px section spacing.
- [x] **H — Header.** Quiet brand title and small logo. Consistent square icon actions. Recorder has a recognizable label and heading rather than an unexplained circular icon alone.
- [x] **I — Inputs.** Persistent labels, shared field padding and focus ring, readable placeholder text, native selects, disabled/error states. Long values and URLs cannot widen the layout.
- [x] **J — Journey: fill.** Header → mode → industry/region → optional AI instructions → scope → one primary fill action → secondary regenerate/undo → fields → provider status. Preserve recognized-form and saved-value continuation semantics.
- [x] **K — Keyboard.** All actions reachable, visible focus, useful accessible names, expanded/selected states exposed. Segmented controls use correct keyboard behavior. Preserve picker Escape/Enter/arrow shortcuts.
- [x] **L — Layout: settings.** Group configuration into navigable General, AI, Voice, Saved forms and About/privacy sections (or equivalent clear anchor navigation). Existing #voice and #mic links continue to work. Do not duplicate/reorder voice cards to indicate navigation.
- [x] **M — Memory.** Saved forms use readable titles, separate domain/metadata, consistent expand controls, compact action buttons. Expanded editor has aligned field labels and values; responsive stacking; explicit pinned states and helpful labels. Preserve rename, pin, unpin and delete behavior.
- [x] **N — Notifications.** One status component for loading, success, warning and failure with icon plus text. Announce important changes. Save feedback is local and truthful; storage errors remain visible with recovery guidance.
- [x] **O — On-page UI.** Picker toolbar and result panels consume the same tokens as extension pages while keeping shadow DOM isolation. Neutral cards, matched controls, consistent highlighted scope and non-blocking positioning.
- [x] **P — Provider setup.** Group provider, API key, model and optional endpoint coherently. Keep key reveal, model refresh and connection testing. Status says configured/tested accurately; hide irrelevant provider fields.
- [x] **Q — Quality of copy.** Short labels and contextual explanations. Distinguish Mock data, AI fill, New values, Fill same values and Undo. Keep privacy and safe-filling explanations accurate.
- [x] **R — Recorder.** Dedicated compact heading, readable recording status, one start/stop action, aligned saved sessions and replay/delete controls. Red only for recording and destructive actions.
- [x] **S — States.** Account for initial loading, no fields, restricted pages, disconnected content script, AI unconfigured, recognized scope, busy fill, success, partial fill, error, undo unavailable, voice permission/transcription and empty saved forms.
- [x] **T — Theme architecture.** Theme values live in one source, global primitive styles in theme.css, layout-only rules in popup.css/options.css. No new heavyweight UI dependency. Document component API and rules for future additions.
- [x] **U — Usability.** Scope selection stays secondary and clearly explained. Primary action stays easy to find. Destructive actions have accessible labels and retain confirmations; reset remains separated from everyday settings.
- [x] **V — Viewports.** Inspect popup at actual CSS dimensions, expanded fields, settings at desktop and narrow widths, long saved values, light/dark appearance and browser zoom. Scrolling stays predictable without horizontal overflow.
- [x] **W — Work preservation.** Do not reset pre-existing edits in README, icons, content, memory store, options, test server or tests. Keep form generation, filling rules, storage keys and provider behavior compatible.
- [x] **X — Execution.** Delegate non-overlapping popup, settings and overlay files; integrate shared tokens/components centrally. Review integrations before final checks.
- [x] **Y — Verification.** Run TypeScript, existing meaningful test suite and production build. Inspect rendered screens and exercise navigation, fill/regenerate/undo, saved-value pinning, provider/voice setup and picker where harness supports them. Record limits honestly.
- [x] **Z — Delivery.** Update this checklist with completed work and validation evidence. Add reusable-system documentation and screenshots if available. Report changed behavior, validation, and remaining limitations.

## File ownership and implementation order

1. Lead: this plan, `src/styles/tokens.ts`, `src/styles/theme.css`, `src/components/ui.tsx`, integration and checks.
2. Popup agent: `src/popup.tsx`, `src/styles/popup.css` only.
3. Settings agent: `src/options.tsx`, `src/styles/options.css` only; preserve existing edits.
4. Overlay agent: `src/lib/picker/host.ts` and overlay visual adapters only; preserve picker behavior.
5. Integrate shared APIs, inspect screens, repair any failures, record results.

## Acceptance criteria

- Popup, settings, recorder, saved forms and injected controls visibly belong to the same system.
- No decorative gradients or glow; no individual screen defines its own palette.
- Shared controls have the same heights, typography, focus treatment and radii.
- Settings can be navigated without scanning one long undifferentiated stack.
- Existing fill, memory, provider and voice features remain functional.
- Both appearances remain readable and narrow settings layouts remain usable.
- Typecheck, tests and build results are recorded, with any environment limits distinguished from product failures.

## Validation log

Completed implementation and integration.

- Shared semantic light/dark tokens: `src/styles/tokens.ts`; generated CSS refreshed automatically by dev/build scripts.
- Reusable primitives: `src/components/ui.tsx`; theme and usage rules: `docs/UI-SYSTEM.md`.
- Popup, settings, saved-value editor, recorder and shadow-root overlay redesigned. No decorative gradient, glow or backdrop blur remains in these styles.
- TypeScript: passed (`bun run typecheck`).
- Existing suite: 178 passed, 0 failed, 410 assertions across 12 files (`bun test tests/`).
- Production build: passed (`bun run build`); output under `build/chrome-mv3-prod/`.
- Browser review: passed in installed Chromium using `tests/e2e/ui-review.cjs`. Verified light/dark rendering, all settings navigation including legacy #mic, narrow 375px layouts, popup fill/regenerate/undo, keyboard mode switching, recorder navigation, saved-value edits and pin/unpin persistence, actual content-script fill/undo, picker cancellation, and Undo availability after scan failure. No browser page errors.
- Screenshots saved under `docs/ui/`: popup, settings, recorder, saved forms, narrow settings and picker.
- Final React review: native semantics, associated labels, radio keyboard support, stable component definitions, existing hooks and TypeScript checked. Corrected Undo coupling to scan readiness and routed AI setup actions directly to #ai.
- Existing unrelated changes remain intact. No commit, publication, or store deployment performed.

Limits: visual/browser checks use the local fixture and a stubbed Chrome API. Live AI-provider requests, microphone permission prompts, real recording/replay and installed-extension browser permissions were not exercised. Native confirmation dialogs retain existing behavior. The desktop browser-control runtime failed to initialize, so a local headless Chromium performed the browser review. Build reports an existing outdated Browserslist database warning; it does not prevent the build.

