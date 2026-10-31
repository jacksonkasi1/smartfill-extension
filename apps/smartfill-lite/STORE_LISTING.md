# Chrome Web Store — SmartFill 1.1.0

Upload `build/chrome-mv3-prod.zip` (created by `bun run package`) as a new
version of the existing item in the Developer Dashboard.

**Permissions did not widen.** 1.0.3 shipped `storage`, `activeTab`, `tabs`,
`scripting` and `http/https` host access. 1.1.0 drops `tabs` and adds only a
keyboard command, so existing users get the update without a new
permission prompt.

## Store listing

**Name** (manifest): SmartFill – AI Form Filler & Test Data Generator

**Summary** (manifest description, ≤132 chars):
SmartFill: one-click form filler. Autofill any form with realistic test data for 20 industries, or with AI (OpenAI, Claude, Gemini).

**Category:** Developer Tools  ·  **Language:** English

**Description:**

> SmartFill fills web forms in one click — perfect for QA testing, demos, and
> anyone tired of typing the same details.
>
> ✦ MOCK DATA — OFFLINE, NO KEY NEEDED
> One consistent, clearly fictional persona fills every field: names, emails,
> phones, addresses, dates, dropdowns, radio buttons and checkboxes.
> Industry-correct identifiers in valid formats: GSTIN, PAN, IFSC, Aadhaar,
> NPI, AWB, HS codes, VIN, IBAN, policy and claim numbers and more.
>
> ✦ 20 INDUSTRY PROFILES + AUTO-DETECT
> Healthcare, CRM, Logistics, Government, Banking, Insurance, E-commerce, HR,
> Education, Real Estate, Travel, Legal, Pharmacy, Manufacturing, SaaS,
> Restaurant, Automotive, Telecom, Events and General. Auto-detect reads the
> page and picks the right one. India, US and UK formats.
>
> ✦ AI FILL WITH YOUR OWN KEY
> OpenAI, Anthropic Claude, Google Gemini, DeepSeek, OpenRouter, xAI Grok,
> Groq, Mistral, Together, Fireworks, Perplexity, Cerebras, Cohere, Qwen,
> Moonshot, NVIDIA, SambaNova, Ollama, LM Studio or any OpenAI-compatible
> endpoint. Models are fetched automatically, or type any model name. Add
> instructions by typing or by voice.
>
> ✦ BUILT FOR SPEED
> Generate again for a new persona, Undo to restore the page, Alt+Shift+F to
> fill without opening the popup, Safe Filling Mode to keep passwords, IDs and
> consent boxes untouched.
>
> ✦ PRIVATE BY DESIGN
> No account, no SmartFill server. Settings and keys stay in your browser.
> Mock data never leaves your device.

## Single purpose

Fill the form fields on the current web page with generated test data,
either locally or using an AI provider the user configures.

## Permission justifications

| Permission | Justification |
| --- | --- |
| `storage` | Saves the user's settings (fill mode, industry profile, region, AI provider, model, API key, instructions) locally. |
| `activeTab` | Lets the popup and keyboard shortcut act on the tab the user is looking at when they ask to fill it. |
| `scripting` | Injects the form-filling script into tabs that were open before the extension was installed or updated. |
| Host permission `http://*/*`, `https://*/*` | Forms can be on any site, so the content script must be able to detect and fill fields on the page the user chooses. The background worker also calls the AI provider the user selects (including self-hosted and local endpoints such as Ollama), whose address is user-configurable. |
| Remote code | No. All code ships in the package; AI providers return JSON data only. |

## Privacy practices (Data usage form)

- **Data collected by the developer:** none. There is no SmartFill server
  and no analytics.
- **Website content:** when the user runs *AI fill*, field labels,
  placeholders, dropdown options, the page title and the user's own
  instructions are sent **directly** to the AI provider the user configured,
  solely to generate form values. Values already typed on the page are never
  sent. *Mock data* mode sends nothing anywhere.
- **Authentication information:** the user's own AI API key is stored in
  `chrome.storage.local` on their device and sent only to that provider.
- Tick: *not sold to third parties*, *not used for unrelated purposes*,
  *not used for creditworthiness or lending*.

Privacy policy URL: use the website's `/privacy` page (apps/website).

## Assets checklist

- [x] Icon 128×128 — `store/store-icon-128.png` (emerald logo, `assets/icon.png` is the 1024 source)
- [x] Screenshots 1280×800 — `store/screenshot-1..4.png`:
  1. Popup over a filled hospital registration form (Mock data, Auto-detect)
  2. AI fill with instructions and the provider footer
  3. Settings page showing the provider list and model fetch
- [x] Small promo tile 440×280 — `store/promo-small-440x280.png`
- [x] Marquee 1400×560 — `store/promo-marquee-1400x560.png`

## Release checklist

1. `bun test tests/` and `bun run typecheck` pass
2. `bun run package`
3. Load `build/chrome-mv3-prod` unpacked and smoke-test Mock fill, AI fill,
   Generate again, Undo and Alt+Shift+F on a real form
4. Upload the zip, update the description and screenshots, submit for review
