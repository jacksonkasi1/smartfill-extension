# Injected UI consistency

The user reports a dark blue form-picker toolbar after the extension screens were made light. Current overlay styles are light, but a successful tab ping can accept a content script retaining an earlier stylesheet.

- [x] Audit popup/settings/injected controls for remaining theme inconsistencies.
- [x] Share one overlay stylesheet between new content scripts and live page refresh.
- [x] Synchronize existing and newly created SmartFill shadow roots before tab actions, preserving controls and their event listeners.
- [x] Fix narrow model controls, saved-editor field contrast and native checkbox accents.
- [x] Verify legacy-style refresh and all injected panels in Chromium on a dark system preference, including narrow viewport bounds.
- [x] Run TypeScript, tests and production build; record results.

Scope: only SmartFill shadow-root styles are updated. No main-page CSS, form data, stored credentials or fill snapshots are changed. Do not inject a second content-script controller just to update its theme.

Validation: TypeScript passed; production build passed; 182 tests passed with 421 assertions. Chromium review passed for popup/settings under both system appearances, serialized legacy-theme refresh with controls still functional, replacement hosts, picker bounds at 320px, saved-area notifications, fill-result/Undo panels, recognized-form panels and narrow AI settings. Every injected panel remained white; picker marker remained neutral black. Screenshot evidence is in `docs/ui/picker-toolbar-light.png`, `picker-refreshed-legacy.png`, `saved-area-panel-light.png`, `fill-result-panel-light.png` and `recognized-form-panel-light.png`. No page errors. Native extension permissions/live AI/voice services remain outside the local fixture review.
