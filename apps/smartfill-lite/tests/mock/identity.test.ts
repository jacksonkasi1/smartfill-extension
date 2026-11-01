import { describe, test, expect } from "bun:test"

// ** import types
import type { FormField } from "../../src/types/extension"

// ** import lib
import { generateMockData, MockGenerator } from "../../src/lib/mock/generator"
import { DEFAULT_IDENTITY, parseEmails } from "../../src/lib/mock/identity"
import { PROFILE_MAP } from "../../src/lib/mock/profiles"

const field = (name: string, type: FormField["type"] = "text"): FormField => ({
  id: name, name, type, value: "", required: false, element: {} as FormField["element"]
})
const fields = [field("email", "email"), field("password", "password"), field("confirm_password", "password")]
const base = { profile: PROFILE_MAP.general, region: "us" as const }

describe("identity presets", () => {
  test("a pinned password is used for password and confirmation", () => {
    const data = generateMockData(fields, { ...base, seed: 1, identity: { ...DEFAULT_IDENTITY, password: "Test@1234" } }) as Record<string, string>
    expect(data.password).toBe("Test@1234")
    expect(data.confirm_password).toBe("Test@1234")
  })

  test("my emails without alias reuse the address as is", () => {
    const identity = { ...DEFAULT_IDENTITY, emailMode: "mine" as const, emails: ["jackson@gmail.com"] }
    for (const seed of [1, 2, 3]) {
      const data = generateMockData(fields, { ...base, seed, identity }) as Record<string, string>
      expect(data.email).toBe("jackson@gmail.com")
    }
  })

  test("alias keeps the mailbox and domain", () => {
    const identity = { ...DEFAULT_IDENTITY, emailMode: "mine" as const, emails: ["jackson@gmail.com"], emailAlias: true }
    const a = generateMockData(fields, { ...base, seed: 1, identity }) as Record<string, string>
    const b = generateMockData(fields, { ...base, seed: 2, identity }) as Record<string, string>
    expect(a.email).toMatch(/^jackson\+[a-z0-9]{5}@gmail\.com$/)
    expect(a.email).not.toBe(b.email)
  })

  test("temp inbox gives a public inbox link", () => {
    const generator = new MockGenerator({ ...base, seed: 4, identity: { ...DEFAULT_IDENTITY, emailMode: "inbox", inboxDomain: "maildrop.cc" } })
    expect(generator.chosenEmail?.email).toMatch(/@maildrop\.cc$/)
    expect(generator.chosenEmail?.inboxUrl).toContain("maildrop.cc/inbox/?mailbox=")
  })

  test("parseEmails accepts lines and commas and drops junk", () => {
    expect(parseEmails("a@x.com, b@y.org\nnot-an-email\na@x.com")).toEqual(["a@x.com", "b@y.org"])
  })
})
