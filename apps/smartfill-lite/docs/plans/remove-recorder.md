# Remove recorder and container padding

User request: remove Record & replay completely and remove unwanted padding.

- [x] Remove popup recorder navigation, view, session controls and related styles/icons.
- [x] Remove recorder content-script routes, listeners, replay engine and message/type contracts.
- [x] Remove popup/settings outer and panel padding; retain control internals for legibility.
- [x] Update current docs and browser review to assert recorder absence and zero popup/panel padding.
- [x] Run TypeScript, tests, production build and browser review.

Preserve voice dictation, filling, saved/pinned values and undo. Do not delete persisted user data as part of removing the feature. Earlier redesign plans/screenshots describe historical states.

Validation: TypeScript passed, 178 tests passed, production build passed. Light/dark Chromium review confirmed no Record/replay controls, zero popup/main-panel and settings/container padding, rejected legacy startRecording messages, working fill/undo and saved-value editing, and no page errors. Voice dictation code remains intact.
