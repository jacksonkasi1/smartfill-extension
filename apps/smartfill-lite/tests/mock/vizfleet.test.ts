/**
 * Regression cases from a real fleet form whose inputs share copy-pasted
 * `name` attributes: the visible label must decide the field kind.
 */

import { describe, test, expect } from "bun:test"

// ** import types
import type { FormField } from "../../src/types/extension"

// ** import lib
import { classifyField } from "../../src/lib/mock/fieldKinds"
import { generateMockData } from "../../src/lib/mock/generator"
import { PROFILE_MAP } from "../../src/lib/mock/profiles"
import { detectProfile } from "../../src/lib/mock/autoDetect"

const field = (name: string, label: string, value = ""): FormField => ({
  id: name,
  name,
  type: "text",
  value,
  label,
  required: false,
  element: { value, getAttribute: () => null } as unknown as FormField["element"]
})

describe("label beats a copy-pasted name", () => {
  const cases: Array<[FormField, string]> = [
    [field("truck_no", "Truck Number"), "vehicleNumber"],
    [field("truck_name", "Truck Name"), "vehicleName"],
    [field("chasis_no", "Chasis Number"), "vin"],
    [field("truck_no_2", "Monthly Payment"), "amount"],
    [field("truck_no_3", "Down Payment"), "amount"],
    [field("interest", "Interest Rate"), "percent"],
    [field("months", "No. of Months"), "tenure"],
    [field("doc_no", "Document No."), "documentNumber"],
    [field("due", "Due Date"), "date"],
    [field("start", "Payment Start Date"), "startDate"]
  ]
  for (const [input, kind] of cases) {
    test(`${input.label} → ${kind}`, () => {
      expect(classifyField(input)).toBe(kind as any)
    })
  }
})

describe("values fit the field", () => {
  test("date pickers keep their dd-MMM-yyyy format and money fields get numbers", () => {
    const fields = [
      field("a", "Due Date", "01-Nov-2026"),
      field("b", "Monthly Payment"),
      field("c", "Interest Rate"),
      field("d", "No. of Months")
    ]
    const data = generateMockData(fields, { profile: PROFILE_MAP.logistics, region: "uk", seed: 5 }) as Record<string, string>
    expect(data.a).toMatch(/^\d{2}-[A-Z][a-z]{2}-\d{4}$/)
    expect(data.b).toMatch(/^\d+$/)
    expect(Number(data.c)).toBeLessThan(20)
    expect(["12", "24", "36", "48", "60"]).toContain(data.d)
  })
})

describe("fleet forms detect as logistics", () => {
  test("truck form with EMI section is logistics, not banking", () => {
    const labels = ["Truck Number", "Truck Name", "Engine Number", "Chasis Number", "Truck Type", "Truck Tonnage", "Bonded", "Tail Gate",
      "Monthly Payment", "Down Payment", "Due Date", "Interest Rate", "No. of Months", "Payment Start Date", "Document Title", "Document No."]
    const result = detectProfile({
      host: "portal.visionstransport.com.my",
      title: "Vizfleet",
      headings: "Vision Truck Basic Details EMI Details Expire Details Uploads",
      fields: labels.map((label, i) => field(`f${i}`, label))
    })
    expect(result.id).toBe("logistics")
  })
})
