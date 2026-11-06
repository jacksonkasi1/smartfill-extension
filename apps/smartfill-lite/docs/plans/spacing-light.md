# Correct spacing and default appearance

The user clarified that only excess padding should be removed. The previous zero-padding change made labels touch panel borders. Restore compact insets while keeping the recorder removed.

- [x] Popup: 12px outer inset, 16px main panel inset, 12px section gaps.
- [x] Settings: 20px main card padding, 16px/12px sidebar padding, compact responsive page spacing and saved-value editor insets.
- [x] Default to light independently of system appearance; retain dark tokens only for explicit opt-in.
- [x] Update browser review to verify restored spacing and light appearance on both light and dark systems, including injected UI.
- [x] Run final TypeScript, tests, build and browser review; inspect screenshots.

No storage schemas, generation, voice or filling behavior changes.

Validation: TypeScript and production build passed; all 178 tests passed. Browser review confirmed compact insets, light appearance under both light and dark system preferences (including the shadow-root picker), working fill/undo and saved values, no horizontal overflow and no page errors. Popup and settings screenshots were visually inspected. The picker explicitly sets color-scheme after its all:initial reset.
