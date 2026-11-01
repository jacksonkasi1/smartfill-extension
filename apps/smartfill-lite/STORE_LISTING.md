# Chrome Web Store — SmartFill 1.2.0

Published listing: https://chromewebstore.google.com/detail/smartfill-lite-ai-form-fi/gcfnhnhofhponjlaanblhnbakpbmdmol

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

Paste this as plain text. It deliberately names **no AI or speech
providers** and has no long lists: 1.2.0 was rejected for "excessive
keywords" (Spam and Placement, ref. Yellow Argon) because the old text
listed 20+ provider names. Keep provider names in the README, not here.

```
SmartFill fills web forms for you in one click. It is made for developers,
testers and anyone who is tired of typing the same details again and again.

HOW IT WORKS
Open a page with a form, click the SmartFill icon and press Fill form.
Text boxes, dropdowns, radio buttons, checkboxes and dates are all filled.
Press Generate again for new values, or Undo to put the page back the way
it was.

REALISTIC TEST DATA, NO SETUP
SmartFill makes up one believable, clearly fake person for each fill, so
the name, email, phone and address all match. It reads the label you see
on the page, so an amount field gets an amount and a date field gets a
date in the same format the page uses. Business and ID numbers follow
real formats for India, the US and the UK. This works offline and needs
no account.

INDUSTRY PROFILES
Choose from 20 industry profiles, such as healthcare, banking, logistics
and e-commerce, or leave it on Auto and SmartFill picks one from the page.

OPTIONAL AI FILL
Connect the AI service you already use with your own API key, and
SmartFill asks it for values that suit the form. You can describe the
person you want, by typing or by voice. If the AI skips a field, test data
fills the gap.

YOUR LOGIN DETAILS
Set one password for every sign-up form, use your own email address with
a new alias each time, or use a free temporary inbox and open it straight
from the popup to read the verification email.

HANDY EXTRAS
- Alt+Shift+F fills the page without opening the popup
- Keep my values only fills empty fields
- Safe Filling Mode leaves passwords, ID numbers and consent boxes alone

PRIVATE BY DESIGN
There is no SmartFill server and no tracking. Settings and keys stay in
your browser. Test data never leaves your computer. AI and voice requests
go only to the service you choose, and only when you ask.
```

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
- **Audio (voice input):** only when the user presses the mic. By default
  the browser's own speech recognition is used. If the user picks a
  speech-to-text service (Groq, OpenAI, ElevenLabs, Deepgram, AssemblyAI,
  Gemini, Mistral, Together, Fireworks or their own server), the recorded
  clip is sent directly to that service with the user's key, solely to
  transcribe it. Nothing is stored or sent elsewhere.
- Tick: *not sold to third parties*, *not used for unrelated purposes*,
  *not used for creditworthiness or lending*.

Privacy policy URL: use the website's `/privacy` page (apps/website).

## Assets checklist

- [x] Icon 128×128 — `store/store-icon-128.png` (blue logo, `assets/icon.png` is the 1024 source)
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
