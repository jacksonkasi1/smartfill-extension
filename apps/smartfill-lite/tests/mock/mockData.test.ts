/**
 * Tests for the offline mock-data engine: field classification,
 * checksummed identifiers, persona consistency and industry
 * auto-detection. Everything here is pure (no chrome.* access).
 */

import { describe, test, expect } from "bun:test"

// ** import types
import type { FormField } from "../../src/types/extension"

// ** import lib
import { classifyField } from "../../src/lib/mock/fieldKinds"
import { generateMockData, gstinCheckChar, luhnCheckDigit } from "../../src/lib/mock/generator"
import { detectProfile } from "../../src/lib/mock/autoDetect"
import { PROFILE_MAP, PROFILES } from "../../src/lib/mock/profiles"
import { detectRegion } from "../../src/lib/mock/regions"

const field = (overrides: Partial<FormField>): FormField => ({
  id: overrides.name ?? "field",
  name: overrides.name ?? "field",
  type: overrides.type ?? "text",
  value: "",
  label: overrides.label,
  placeholder: overrides.placeholder,
  required: false,
  element: {} as FormField["element"],
  options: overrides.options
})

describe("classifyField", () => {
  const cases: Array<[Partial<FormField>, string]> = [
    [{ name: "firstName" }, "firstName"],
    [{ name: "last_name" }, "lastName"],
    [{ name: "full_name", label: "Patient Name" }, "fullName"],
    [{ name: "email", type: "email" }, "email"],
    [{ name: "confirmEmail", label: "Confirm email" }, "confirmEmail"],
    [{ name: "password", type: "password" }, "password"],
    [{ name: "confirm_password", type: "password" }, "confirmPassword"],
    [{ name: "mobile", label: "Mobile Number" }, "phone"],
    [{ name: "gstin", label: "GST Number" }, "gstin"],
    [{ name: "pan_no", label: "PAN" }, "pan"],
    [{ name: "ifsc", label: "IFSC Code" }, "ifsc"],
    [{ name: "awb", label: "AWB Number" }, "trackingNumber"],
    [{ name: "hsn", label: "HSN Code" }, "hsCode"],
    [{ name: "npi", label: "NPI" }, "npi"],
    [{ name: "uhid", label: "UHID" }, "mrn"],
    [{ name: "pincode", label: "PIN Code" }, "postalCode"],
    [{ name: "zip" }, "postalCode"],
    [{ name: "company", label: "Company name" }, "company"],
    [{ name: "order_notes", label: "Order notes" }, "longText"],
    [{ name: "patient_notes", label: "Patient notes" }, "longText"],
    [{ name: "q", label: "Search", type: "text" }, "skip"],
    [{ name: "dob", type: "date" }, "dob"],
    [{ name: "message", type: "textarea" }, "longText"],
    [{ name: "country_code", label: "Country code" }, "dialCode"],
    [{ name: "terms", type: "checkbox", label: "I agree to the terms" }, "consent"],
    [{ name: "newsletter", type: "checkbox", label: "Subscribe to newsletter" }, "optIn"],
    [{ name: "ref", label: "Reference No" }, "reference"]
  ]

  for (const [input, kind] of cases) {
    test(`${input.label ?? input.name} → ${kind}`, () => {
      expect(classifyField(field(input))).toBe(kind as any)
    })
  }
})

describe("checksummed identifiers", () => {
  test("GSTIN check character matches a published sample", () => {
    // 27AAPFU0939F1ZV is the GSTN documentation sample.
    expect(gstinCheckChar("27AAPFU0939F1Z")).toBe("V")
  })

  test("Luhn check digit for the Visa test card", () => {
    expect(luhnCheckDigit("411111111111111")).toBe(1)
  })
})

describe("generateMockData", () => {
  const fields = [
    field({ name: "first_name" }),
    field({ name: "last_name" }),
    field({ name: "email", type: "email" }),
    field({ name: "password", type: "password" }),
    field({ name: "confirm_password", type: "password" }),
    field({ name: "gstin", label: "GSTIN" }),
    field({ name: "npi", label: "NPI" }),
    field({ name: "gender", type: "radio", options: ["male", "female", "other"] }),
    field({ name: "search", type: "text" }),
    field({ name: "visit_date", type: "date" })
  ]

  test("is deterministic for a seed and varies across seeds", () => {
    const a = generateMockData(fields, { profile: PROFILE_MAP.healthcare, region: "in", seed: 42 })
    const b = generateMockData(fields, { profile: PROFILE_MAP.healthcare, region: "in", seed: 42 })
    const c = generateMockData(fields, { profile: PROFILE_MAP.healthcare, region: "in", seed: 7 })
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })

  test("keeps one persona consistent across fields", () => {
    const data = generateMockData(fields, { profile: PROFILE_MAP.general, region: "in", seed: 3 }) as Record<string, any>
    const first = String(data.first_name).toLowerCase()
    expect(String(data.email)).toContain(first)
    expect(data.password).toBe(data.confirm_password)
  })

  test("produces valid-format identifiers", () => {
    for (let seed = 1; seed < 20; seed++) {
      const data = generateMockData(fields, { profile: PROFILE_MAP.logistics, region: "in", seed }) as Record<string, any>
      const gstin = String(data.gstin)
      expect(gstin).toMatch(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9]Z[0-9A-Z]$/)
      expect(gstin[14]).toBe(gstinCheckChar(gstin.slice(0, 14)))
      const npi = String(data.npi)
      expect(npi).toMatch(/^\d{10}$/)
      expect(Number(npi[9])).toBe(luhnCheckDigit(`80840${npi.slice(0, 9)}`))
    }
  })

  test("picks a real option, skips search boxes and uses ISO for date inputs", () => {
    const data = generateMockData(fields, { profile: PROFILE_MAP.general, region: "us", seed: 9 }) as Record<string, any>
    expect(["male", "female"]).toContain(data.gender)
    expect(data.search).toBeNull()
    expect(String(data.visit_date)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test("every profile generates without throwing", () => {
    for (const profile of PROFILES) {
      const data = generateMockData(fields, { profile, region: "uk", seed: 1 })
      expect(Object.keys(data).length).toBe(fields.length)
    }
  })
})

describe("detectProfile", () => {
  test("detects a hospital form", () => {
    const result = detectProfile({
      host: "care.sunrisehospital.example",
      title: "Patient Registration",
      headings: "New patient appointment",
      fields: [field({ name: "uhid", label: "UHID" }), field({ name: "allergies", label: "Known allergies" })]
    })
    expect(result.id).toBe("healthcare")
  })

  test("detects a shipment form", () => {
    const result = detectProfile({
      host: "ship.example.com",
      title: "Book a shipment",
      headings: "Consignee details Pickup address",
      fields: [field({ name: "awb", label: "AWB Number" })]
    })
    expect(result.id).toBe("logistics")
  })

  test("falls back to general without strong signals", () => {
    const result = detectProfile({ host: "example.com", title: "Contact", headings: "", fields: [field({ name: "name" })] })
    expect(result.id).toBe("general")
  })
})

describe("detectRegion", () => {
  test("uses TLD then browser language", () => {
    expect(detectRegion("gov.example.in", "en-US")).toBe("in")
    expect(detectRegion("shop.example.co.uk", "en-US")).toBe("uk")
    expect(detectRegion("example.com", "en-IN")).toBe("in")
    expect(detectRegion("example.com", "en-US")).toBe("us")
  })

  test("region-specific fields beat the browser language", () => {
    expect(detectRegion("example.com", "en-GB", "aadhaar number | pin code")).toBe("in")
    expect(detectRegion("example.com", "en-IN", "ssn | zip code")).toBe("us")
  })
})
