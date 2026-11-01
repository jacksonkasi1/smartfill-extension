/**
 * Voice input: which service a plan picks, and the exact request each
 * speech-to-text API receives. `fetch` is stubbed; nothing hits the network.
 */

import { describe, test, expect, afterEach } from "bun:test"

// ** import types
import type { Settings } from "../../src/lib/settings"

// ** import lib
import { DEFAULT_SETTINGS, resolveVoice } from "../../src/lib/settings"

// ** import apis
import { transcribe } from "../../src/api/voice/transcribe"

const settings = (patch: Partial<Settings> = {}, voice: Partial<Settings["voice"]> = {}): Settings => ({
  ...DEFAULT_SETTINGS,
  ...patch,
  voice: { ...DEFAULT_SETTINGS.voice, ...voice }
})

describe("resolveVoice", () => {
  test("auto with no keys stays browser-only", () => {
    expect(resolveVoice(settings())).toEqual({ mode: "auto" })
  })

  test("auto reuses the Groq AI key for Whisper", () => {
    const plan = resolveVoice(settings({ apiKeys: { groq: "gsk_test" } }))
    expect(plan.mode).toBe("auto")
    expect(plan.target?.provider).toBe("groq")
    expect(plan.target?.apiKey).toBe("gsk_test")
    expect(plan.target?.model).toBe("whisper-large-v3-turbo")
  })

  test("a voice-only key (ElevenLabs) beats shared AI keys in auto", () => {
    const plan = resolveVoice(settings({ apiKeys: { groq: "gsk_test" } }, { apiKeys: { elevenlabs: "sk_el" } }))
    expect(plan.target?.provider).toBe("elevenlabs")
  })

  test("an explicit service without a key reports no target", () => {
    expect(resolveVoice(settings({}, { provider: "deepgram" }))).toEqual({ mode: "cloud", target: undefined })
  })

  test("custom server works without a key and keeps the chosen model", () => {
    const plan = resolveVoice(settings({}, { provider: "custom", customBaseUrl: "http://localhost:8000/v1/", models: { custom: "base.en" } }))
    expect(plan.target).toEqual({ provider: "custom", apiKey: "", baseUrl: "http://localhost:8000/v1", model: "base.en" })
  })

  test("browser only never uploads", () => {
    expect(resolveVoice(settings({ apiKeys: { openai: "sk" } }, { provider: "browser" }))).toEqual({ mode: "browser" })
  })
})

describe("transcribe request shapes", () => {
  const realFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = realFetch })
  const audio = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm;codecs=opus" })

  function stub(responses: unknown[]) {
    const calls: Array<{ url: string, init: RequestInit }> = []
    globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
      calls.push({ url: String(url), init })
      return new Response(JSON.stringify(responses.shift()), { status: 200 })
    }) as typeof fetch
    return calls
  }

  test("OpenAI-compatible: multipart to /audio/transcriptions with Bearer", async () => {
    const calls = stub([{ text: " hello " }])
    const text = await transcribe(audio, { provider: "groq", apiKey: "k", model: "whisper-large-v3-turbo", baseUrl: "https://api.groq.com/openai/v1" })
    expect(text).toBe("hello")
    expect(calls[0].url).toBe("https://api.groq.com/openai/v1/audio/transcriptions")
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer k")
    const form = calls[0].init.body as FormData
    expect(form.get("model")).toBe("whisper-large-v3-turbo")
    expect((form.get("file") as File).name).toBe("speech.webm")
  })

  test("ElevenLabs: xi-api-key and model_id", async () => {
    const calls = stub([{ text: "hi" }])
    await transcribe(audio, { provider: "elevenlabs", apiKey: "k", model: "scribe_v1", baseUrl: "https://api.elevenlabs.io/v1" })
    expect(calls[0].url).toBe("https://api.elevenlabs.io/v1/speech-to-text")
    expect((calls[0].init.headers as Record<string, string>)["xi-api-key"]).toBe("k")
    expect((calls[0].init.body as FormData).get("model_id")).toBe("scribe_v1")
  })

  test("Deepgram: raw audio, Token auth, model in query", async () => {
    const calls = stub([{ results: { channels: [{ alternatives: [{ transcript: "deep" }] }] } }])
    const text = await transcribe(audio, { provider: "deepgram", apiKey: "k", model: "nova-3", baseUrl: "https://api.deepgram.com/v1" })
    expect(text).toBe("deep")
    expect(calls[0].url).toContain("https://api.deepgram.com/v1/listen?model=nova-3")
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers.Authorization).toBe("Token k")
    expect(headers["Content-Type"]).toBe("audio/webm")
  })

  test("AssemblyAI: upload, create job, poll until completed", async () => {
    const calls = stub([{ upload_url: "https://cdn/u1" }, { id: "t1" }, { status: "processing" }, { status: "completed", text: "done" }])
    const text = await transcribe(audio, { provider: "assemblyai", apiKey: "k", model: "universal", baseUrl: "https://api.assemblyai.com/v2" })
    expect(text).toBe("done")
    expect(calls.map(c => c.url)).toEqual([
      "https://api.assemblyai.com/v2/upload",
      "https://api.assemblyai.com/v2/transcript",
      "https://api.assemblyai.com/v2/transcript/t1",
      "https://api.assemblyai.com/v2/transcript/t1"
    ])
    expect(JSON.parse(calls[1].init.body as string)).toMatchObject({ audio_url: "https://cdn/u1", speech_model: "universal" })
  })

  test("Gemini: inline base64 audio in generateContent", async () => {
    const calls = stub([{ candidates: [{ content: { parts: [{ text: "gem" }] } }] }])
    const text = await transcribe(audio, { provider: "gemini", apiKey: "k", model: "gemini-2.5-flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta" })
    expect(text).toBe("gem")
    expect(calls[0].url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent")
    const body = JSON.parse(calls[0].init.body as string)
    expect(body.contents[0].parts[1].inline_data).toEqual({ mime_type: "audio/webm", data: "AQID" })
  })

  test("a rejected key becomes a readable error", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: { message: "Invalid API Key" } }), { status: 401 })) as unknown as typeof fetch
    await expect(transcribe(audio, { provider: "groq", apiKey: "bad", model: "m", baseUrl: "https://x/v1" }))
      .rejects.toThrow("Groq Whisper rejected the API key. Invalid API Key")
  })
})
