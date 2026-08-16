// Fill constants for SmartFill Lite.
//
// We deliberately do NOT use a fixed per-field delay; native fields
// fill immediately. Custom UI may briefly poll for an asynchronously
// rendered popup, but never blocks for hundreds of milliseconds.

/** Maximum attempts for a single native field. */
export const NATIVE_MAX_ATTEMPTS = 1

/** Maximum attempts for a single custom-UI field. */
export const CUSTOM_MAX_ATTEMPTS = 2

/** Polling gap (ms) between attempts on custom UI. */
export const CUSTOM_RETRY_GAP_MS = 120

/** Total budget (ms) for resolving a custom dropdown popup. */
export const CUSTOM_POPUP_BUDGET_MS = 250
