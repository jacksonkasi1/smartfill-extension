/**
 * Focused regression tests for the two PR #11 follow-up fixes:
 *
 *   Fix 1 — Password fields are sensitive even when the name does
 *           not match a known pattern. isSensitiveField returns
 *           true for any field with type === "password" and the
 *           parser's "password" key group accepts the canonical
 *           "Password: ..." / "Confirm Password: ..." patterns.
 *
 *   Fix 2 — Consent detection no longer triggers on general data
 *           fields. isConsentField returns false for "Medical
 *           Conditions", "Legal Name", "Agreement Number", etc.
 *           but still returns true for the obvious consent shapes
 *           ("Terms", "Privacy Consent", "Newsletter", ...).
 *
 * The tests run under `bun test` and import the parser and
 * sensitiveFields module directly. Both are pure (no chrome.* /
 * DOM access).
 */

import { describe, test, expect } from "bun:test"

// ** import the system under test
import { parseAIResponse } from "../../src/api/ai/parser"
import { isSensitiveField, isConsentField } from "../../src/api/ai/sensitiveFields"

// ** import types
import type { FormField } from "../../src/types/extension"

// ---------------------------------------------------------------------------
// Field fixtures
// ---------------------------------------------------------------------------

const baseField = (overrides: Partial<FormField> = {}): FormField => {
  const stubElement = {} as FormField["element"]
  return {
    id: overrides.name ?? "field",
    name: overrides.name ?? "field",
    type: overrides.type ?? "text",
    value: "",
    label: overrides.label,
    placeholder: overrides.placeholder,
    required: overrides.required ?? false,
    element: stubElement,
    options: overrides.options
  } as FormField
}

const passwordField = (name: string, label?: string): FormField =>
  baseField({ name, type: "password", label: label ?? name })

// ---------------------------------------------------------------------------
// Fix 1 — Password is sensitive.
// ---------------------------------------------------------------------------

describe("Fix 1 — isSensitiveField treats password as sensitive", () => {
  test("type=password, name=password → true", () => {
    expect(isSensitiveField(passwordField("password"))).toBe(true)
  })

  test("type=password, name=pwd (no pattern match) → true via type", () => {
    // The old detection only looked at name/label/placeholder; a
    // non-`password` named input with no "passport"/"ssn"/... in
    // its haystack would slip through. The new type check makes
    // every password-typed field sensitive.
    expect(isSensitiveField(passwordField("pwd"))).toBe(true)
  })

  test("type=password, name=user_pass → true", () => {
    expect(isSensitiveField(passwordField("user_pass"))).toBe(true)
  })

  test("type=password, name=confirmPassword → true", () => {
    expect(isSensitiveField(passwordField("confirmPassword", "Confirm Password"))).toBe(true)
  })

  test("type=text, name=password → still true via name-pattern", () => {
    // The text-based detection (now includes 'password' /
    // 'passwd' / 'passphrase') still catches a non-password-typed
    // field that explicitly looks like a password (custom widget).
    expect(isSensitiveField(baseField({ name: "password", type: "text" }))).toBe(true)
  })

  test("type=text, name=passphrase → true via name-pattern", () => {
    expect(isSensitiveField(baseField({ name: "passphrase", type: "text" }))).toBe(true)
  })

  test("type=text, name=username (control) → false", () => {
    // Sanity check: a non-password field is not sensitive just
    // because the type-check was added.
    expect(isSensitiveField(baseField({ name: "username", type: "text" }))).toBe(false)
  })
})

describe("Fix 1 — end-to-end parser behaviour for password", () => {
  const password = passwordField("password", "Password")
  const confirm = passwordField("confirmPassword", "Confirm Password")

  test("Safe OFF: AI password is kept", () => {
    const out = parseAIResponse(
      JSON.stringify({ password: "StrongPass#4821", confirmPassword: "StrongPass#4821" }),
      [password, confirm]
    )
    expect(out.password).toBe("StrongPass#4821")
    expect(out.confirmPassword).toBe("StrongPass#4821")
  })

  test("Safe ON, no context: password and confirmPassword are blanked", () => {
    const out = parseAIResponse(
      JSON.stringify({ password: "StrongPass#4821", confirmPassword: "StrongPass#4821" }),
      [password, confirm],
      undefined,
      { safeFillingMode: true }
    )
    expect(out.password).toBe("")
    expect(out.confirmPassword).toBe("")
  })

  test("Safe ON, context 'Password: StrongPass#4821': both fields get the value", () => {
    const out = parseAIResponse(
      JSON.stringify({ password: "StrongPass#4821", confirmPassword: "StrongPass#4821" }),
      [password, confirm],
      "Password: StrongPass#4821",
      { safeFillingMode: true }
    )
    expect(out.password).toBe("StrongPass#4821")
    expect(out.confirmPassword).toBe("StrongPass#4821")
  })

  test("Safe ON, AI-invented password is discarded even when context is unrelated", () => {
    // The user wrote only their passport in Custom Instructions.
    // The AI still returned a password. Safe Mode must drop the
    // AI-invented password.
    const out = parseAIResponse(
      JSON.stringify({ password: "StrongPass#4821" }),
      [password],
      "Passport: N1234567",
      { safeFillingMode: true }
    )
    expect(out.password).toBe("")
  })

  test("Safe ON, AI empty password: stays empty (no error)", () => {
    // Empty sensitive value is preserved as the user's intent.
    const out = parseAIResponse(
      JSON.stringify({ password: "" }),
      [password],
      undefined,
      { safeFillingMode: true }
    )
    expect(out.password).toBe("")
  })
})

// ---------------------------------------------------------------------------
// Fix 2 — Consent no longer over-matches.
// ---------------------------------------------------------------------------

describe("Fix 2 — isConsentField rejects over-broad matches", () => {
  test("Medical Conditions checkbox → false", () => {
    const f = baseField({
      name: "medicalConditions",
      label: "Medical Conditions",
      type: "checkbox"
    })
    expect(isConsentField(f)).toBe(false)
  })

  test("Health Condition checkbox → false", () => {
    const f = baseField({
      name: "healthCondition",
      label: "Health Condition",
      type: "checkbox"
    })
    expect(isConsentField(f)).toBe(false)
  })

  test("Legal Name (text) → false", () => {
    // Text fields are never consent (control).
    const f = baseField({
      name: "legalName",
      label: "Legal Name",
      type: "text"
    })
    expect(isConsentField(f)).toBe(false)
  })

  test("Legal Entity Name (text) → false", () => {
    const f = baseField({
      name: "legalEntityName",
      label: "Legal Entity Name",
      type: "text"
    })
    expect(isConsentField(f)).toBe(false)
  })

  test("Agreement Number (text) → false", () => {
    const f = baseField({
      name: "agreementNumber",
      label: "Agreement Number",
      type: "text"
    })
    expect(isConsentField(f)).toBe(false)
  })

  test("Contract Agreement ID (text) → false", () => {
    const f = baseField({
      name: "contractAgreementId",
      label: "Contract Agreement ID",
      type: "text"
    })
    expect(isConsentField(f)).toBe(false)
  })

  test("Agreement Number as a checkbox → still false", () => {
    // Even if some page renders it as a checkbox, the label does
    // not describe consent.
    const f = baseField({
      name: "agreementNumber",
      label: "Agreement Number",
      type: "checkbox"
    })
    expect(isConsentField(f)).toBe(false)
  })
})

describe("Fix 2 — isConsentField still recognises real consent shapes", () => {
  test("Terms checkbox → true", () => {
    const f = baseField({
      name: "terms",
      label: "I accept the Terms and Conditions",
      type: "checkbox"
    })
    expect(isConsentField(f)).toBe(true)
  })

  test("Privacy Consent checkbox → true", () => {
    const f = baseField({
      name: "privacyConsent",
      label: "Privacy Consent",
      type: "checkbox"
    })
    expect(isConsentField(f)).toBe(true)
  })

  test("Newsletter checkbox → true", () => {
    const f = baseField({
      name: "newsletter",
      label: "Subscribe to our newsletter",
      type: "checkbox"
    })
    expect(isConsentField(f)).toBe(true)
  })

  test("Marketing Opt-In checkbox → true (marketing keyword + opt-in regex)", () => {
    const f = baseField({
      name: "marketingOptIn",
      label: "Marketing Opt-In",
      type: "checkbox"
    })
    expect(isConsentField(f)).toBe(true)
  })

  test("Cookie Consent checkbox → true (cookie / cookies plural)", () => {
    const f = baseField({
      name: "cookieConsent",
      label: "Cookie Consent",
      type: "checkbox"
    })
    expect(isConsentField(f)).toBe(true)
  })

  test("Cookies checkbox (plural label) → true", () => {
    const f = baseField({
      name: "cookies",
      label: "Accept cookies",
      type: "checkbox"
    })
    expect(isConsentField(f)).toBe(true)
  })
})
