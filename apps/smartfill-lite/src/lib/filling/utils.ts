/**
 * Internal helpers used by the fill pipeline.
 *
 * `triggerEvents` lives in `fieldFiller.ts` (it is exported there so
 * tests / external callers can fire the same event sequence the filler
 * uses). `delay` remains here for any internal helper that genuinely
 * needs a short async wait.
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
