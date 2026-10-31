# SmartFill Lite

Fill any web form in one click — with realistic **mock data** generated on
your device, or with **AI** from the provider of your choice. No account,
no backend.

## Two ways to fill

| Mode | What it does | Needs |
| --- | --- | --- |
| **Mock data** | Generates one consistent, clearly fictional persona and fills every field: names, emails, phones, addresses, dates, dropdowns, radios, checkboxes and domain identifiers (GSTIN, PAN, IFSC, Aadhaar, NPI, AWB, VIN, IBAN, …) in valid formats. | Nothing — works offline |
| **AI fill** | Sends field labels, options, the industry profile and your instructions to your AI provider. Anything the AI skips falls back to the mock persona, so the form is always complete. | An API key (or a local model) |

### Industry profiles

Pick one in the popup or leave it on **Auto-detect**, which scores the
page title, headings, host and field labels:

General · Healthcare / Hospital · CRM / Sales · Logistics & Shipping ·
Government / Public · Banking & Finance · Insurance · E-commerce / Retail ·
HR & Recruitment · Education · Real Estate · Travel & Hospitality · Legal ·
Pharmacy & Lab · Manufacturing / ERP · SaaS / Tech Sign-up ·
Restaurant & Food · Automotive · Telecom & Utilities · Events & Non-profit

**Region** (India, US, UK or Auto) sets phone, postal-code, date and ID
formats. Auto uses the site's TLD, then region-specific fields (an Aadhaar
or PIN-code field means India), then the browser language.

The selected mode, profile and region are remembered until you change them.

### AI providers

OpenAI · Anthropic Claude · Google Gemini · DeepSeek · OpenRouter ·
xAI Grok · Groq · Mistral · Together · Fireworks · Perplexity · Cerebras ·
Cohere · Alibaba Qwen · Moonshot Kimi · NVIDIA NIM · SambaNova ·
Ollama (local) · LM Studio (local) · any custom OpenAI-compatible endpoint.

Settings fetch the live model list from the provider automatically; you can
also type any model ID. **Test connection** sends a one-word request.

### Popup

- **Fill form / Fill with AI** — fill the current page
- **Generate again** — new persona, same settings
- **Undo** — restore the page exactly as it was before the last fill
- **Instructions + mic** (AI mode) — type or dictate context such as
  “Senior doctor in Chennai, use @acme.in emails”. The first time, Chrome
  asks for microphone access in a settings tab.
- **Record & replay** — record clicks and typing on a site and replay them
- Shortcut: **Alt+Shift+F** fills the page with the saved mode

## Quick start

```bash
# from the monorepo root
bun install

cd apps/smartfill-lite
bun run dev        # development build with reload
bun run build      # production build → build/chrome-mv3-prod
bun run package    # store zip → build/chrome-mv3-prod.zip
bun test tests/    # unit tests
bun run typecheck
```

Load `build/chrome-mv3-prod` at `chrome://extensions` → Developer mode →
Load unpacked.

## Architecture

- `src/popup.tsx` — compact popup (mode, profile, region, fill, undo, fields)
- `src/options.tsx` — settings page (provider, key, base URL, model, toggles)
- `src/content.ts` — detect → resolve profile/region → mock (+ AI) → fill
- `src/background.ts` — every AI network call (`completeChat`, `listModels`,
  connection test) and the keyboard shortcut
- `src/api/ai/` — provider registry, OpenAI-compatible / Anthropic / Gemini
  adapters, prompt builder, response parser, Safe Filling Mode rules
- `src/lib/mock/` — seeded generator, field classifier, 20 profiles,
  region data, page auto-detection
- `src/lib/settings.ts` — one settings object in `chrome.storage.local`
  (migrates the 1.0.x `chrome.storage.sync` keys on first run)

Chrome Web Store submission notes live in [STORE_LISTING.md](STORE_LISTING.md).
