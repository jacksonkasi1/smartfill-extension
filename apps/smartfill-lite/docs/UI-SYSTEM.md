# SmartFill interface system

The current visual contract is [DESIGN.md](../DESIGN.md). This implementation guide preserves the shared architecture and verification workflow.

## Theme ownership

`src/styles/tokens.ts` is the canonical source for color and measurement tokens. The popup and settings import `theme.css`, which imports generated `tokens.css`. The shadow-root overlay imports `overlayThemeCss` from the same TypeScript source.

Run `node scripts/generate-theme.mjs` after editing tokens. Development and production build commands run the generator automatically. Never hand-edit generated `tokens.css` or `font-data.ts`. The generator also embeds the bundled OFL-licensed font for shadow-root FontFace registration.

Use semantic variables instead of color literals in feature styles. Light is the default even on a dark system; dark tokens require explicit `data-theme="dark"` opt-in. A neutral canvas, surface, subtle surface and border create hierarchy. Primary actions, selected navigation and focus use the monochrome reference treatment. `--muted` is the soft background; `--muted-foreground` is secondary text. Success, warning and danger colors communicate state.

## Measurements

| Purpose | Rule |
| --- | --- |
| Spacing | 4, 8, 12, 16, 20, 24, 32px |
| Body | 14px locally bundled Geist; picker text 13px/20px |
| Supporting text | 12px, 18px line height |
| Section heading | 14px semibold |
| Settings page heading | 24px, 32px line height |
| Default control | 36px minimum height, 12px radius |
| Compact/icon control | 32px minimum height |
| Primary popup action | 40px height |
| Card | 20px radius, subtle neutral ring and layered shadow |
| Popup | 380px width, compact 12px outer / 16px panel padding |

Use regular, medium and semibold text. Decorative gradients, colored glow and translucent glass do not belong in the system. Primary popup actions and segmented controls use pill radii to match the reference. The existing product icon is retained as a brand asset.

## React primitives

Import from `@/components/ui`:

- `Button`: native button attributes; `variant="primary|secondary|ghost|danger"`, `size="sm|md"`. Defaults to a secondary button with `type="button"`.
- `IconButton`: compact square button. Supply an `aria-label`; use `title` as a supplementary tooltip.
- `Field`: `label`, optional `hint` and `error`, with one native input/select/textarea in its children. Connects the label, hint and validation state to that control, including a control inside a wrapper.
- `Section`: optional `title` and `description`, followed by related content.
- `Badge`: `tone="neutral|accent|success|warning|danger"`; supplemental status text.
- `SelectPicker`: controlled selection with `value`, `onChange`, `options` and `aria-label`. Optional `searchable` and `allowCustom` support providers and model IDs. Menus portal to the document body, use 320px panels, and support keyboard selection, Escape and outside dismissal.
- `Status` from `@/components/Status`: loading/success/warning/error message with live-region semantics and optional recovery action.

Use native controls where practical. Radio-style segmented groups support arrows, Home and End; selected state and tab stops must agree. Visible focus applies to every interactive control. Labels must persist after typing. Status text and icons supplement color.

## Screen composition

`theme.css` owns the shared controls. `popup.css` and `options.css` own screen composition. Existing native settings controls inherit the same base primitives; do not add a second button or field skin to a screen stylesheet.

Settings uses hash navigation: `#general`, `#ai`, `#voice`, `#forms`, `#about`. Legacy `#mic` opens Voice. Inactive groups remain mounted and hidden so navigation preserves drafts without duplicating components.

The picker keeps its shadow-root boundary and top-layer behavior. Its visual aliases resolve to shared tokens; do not introduce a separate light/dark palette there. `src/lib/picker/styles.ts` owns its shared stylesheet. Before tab actions, `themeSync.ts` refreshes existing SmartFill shadow roots and watches for replacement hosts so an older content controller cannot retain the old dark theme. It preserves controls/listeners and never restyles the visited page.

## Validation

1. `bun run typecheck`
2. `bun test tests/`
3. `bun run build`
4. `bun tests/e2e/serve.ts`
5. In another shell: `node tests/e2e/ui-review.cjs` with `playwright-core` available. An absolute installation path can be passed as the first argument. Set `SMARTFILL_CHROMIUM` to an installed Chromium executable if required.

The browser review saves screenshots under `docs/ui/` and checks navigation, light/dark appearance, narrow layouts, popup actions, saved-value editing/pinning, actual content-script fill/undo and picker cancellation. AI/voice network calls and installed-extension permissions need separate manual checks with a configured provider; the local fixture uses a stubbed Chrome API.
