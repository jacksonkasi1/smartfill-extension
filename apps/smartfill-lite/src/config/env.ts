/**
 * Environment configuration for SmartFill Lite.
 *
 * This build has NO Clerk and NO RAG. The extension is fully standalone:
 * the user provides their own AI provider key, which is stored locally in
 * `chrome.storage.sync`. There is no remote backend and no auth service.
 */
export const ENV = {
  // Reserved for future use. All build-time values are optional now.
} as const
