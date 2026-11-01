// ** import types
import type { VoiceProviderId } from './constants'

// ** import constants
import { VOICE_PROVIDERS } from './constants'

export interface VoiceTarget {
  provider: VoiceProviderId
  apiKey: string
  model: string
  baseUrl: string
}

const ASSEMBLY_POLL_MS = 800
const ASSEMBLY_TIMEOUT_MS = 60_000

/** Turn a recorded clip into text with the chosen service. */
export async function transcribe(audio: Blob, target: VoiceTarget): Promise<string> {
  switch (VOICE_PROVIDERS[target.provider].kind) {
    case 'elevenlabs': return elevenLabs(audio, target)
    case 'deepgram': return deepgram(audio, target)
    case 'assemblyai': return assemblyAI(audio, target)
    case 'gemini': return gemini(audio, target)
    default: return openAICompatible(audio, target)
  }
}

/** MediaRecorder reports "audio/webm;codecs=opus"; services want the bare type. */
function mimeOf(audio: Blob): string {
  return (audio.type || 'audio/webm').split(';')[0]
}

function fileName(audio: Blob): string {
  return `speech.${mimeOf(audio).split('/')[1] || 'webm'}`
}

async function readJson(res: Response, service: string): Promise<any> {
  if (res.ok) return res.json()
  let detail = ''
  try {
    const body = await res.json()
    detail = body?.error?.message || body?.detail?.message || body?.err_msg || body?.error || body?.message || ''
  } catch { /* non-JSON error page */ }
  if (res.status === 401 || res.status === 403) throw new Error(`${service} rejected the API key.${detail ? ` ${detail}` : ''}`)
  throw new Error(`${service} error ${res.status}${detail ? `: ${detail}` : ''}`)
}

async function openAICompatible(audio: Blob, target: VoiceTarget): Promise<string> {
  const form = new FormData()
  form.append('file', audio, fileName(audio))
  form.append('model', target.model)
  const res = await fetch(`${target.baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: target.apiKey ? { Authorization: `Bearer ${target.apiKey}` } : {},
    body: form
  })
  const data = await readJson(res, VOICE_PROVIDERS[target.provider].name)
  return String(data.text ?? '').trim()
}

async function elevenLabs(audio: Blob, target: VoiceTarget): Promise<string> {
  const form = new FormData()
  form.append('file', audio, fileName(audio))
  form.append('model_id', target.model)
  const res = await fetch(`${target.baseUrl}/speech-to-text`, {
    method: 'POST',
    headers: { 'xi-api-key': target.apiKey },
    body: form
  })
  const data = await readJson(res, 'ElevenLabs')
  return String(data.text ?? '').trim()
}

async function deepgram(audio: Blob, target: VoiceTarget): Promise<string> {
  const params = new URLSearchParams({ model: target.model, smart_format: 'true', detect_language: 'true' })
  const res = await fetch(`${target.baseUrl}/listen?${params}`, {
    method: 'POST',
    headers: { Authorization: `Token ${target.apiKey}`, 'Content-Type': mimeOf(audio) },
    body: audio
  })
  const data = await readJson(res, 'Deepgram')
  return String(data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '').trim()
}

/** AssemblyAI is asynchronous: upload, create a job, then poll for the text. */
async function assemblyAI(audio: Blob, target: VoiceTarget): Promise<string> {
  const headers = { authorization: target.apiKey }
  const upload = await readJson(
    await fetch(`${target.baseUrl}/upload`, { method: 'POST', headers, body: audio }),
    'AssemblyAI'
  )
  const job = await readJson(
    await fetch(`${target.baseUrl}/transcript`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: upload.upload_url, speech_model: target.model, language_detection: true })
    }),
    'AssemblyAI'
  )
  const deadline = Date.now() + ASSEMBLY_TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, ASSEMBLY_POLL_MS))
    const state = await readJson(await fetch(`${target.baseUrl}/transcript/${job.id}`, { headers }), 'AssemblyAI')
    if (state.status === 'completed') return String(state.text ?? '').trim()
    if (state.status === 'error') throw new Error(`AssemblyAI: ${state.error || 'transcription failed'}`)
  }
  throw new Error('AssemblyAI took too long to transcribe.')
}

async function gemini(audio: Blob, target: VoiceTarget): Promise<string> {
  const bytes = new Uint8Array(await audio.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  const res = await fetch(`${target.baseUrl}/models/${encodeURIComponent(target.model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': target.apiKey },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: 'Transcribe this audio exactly as spoken. Reply with the transcript only, no quotes or commentary.' },
          { inline_data: { mime_type: mimeOf(audio), data: btoa(binary) } }
        ]
      }],
      generationConfig: { temperature: 0 }
    })
  })
  const data = await readJson(res, 'Gemini')
  const parts: Array<{ text?: string }> = data.candidates?.[0]?.content?.parts ?? []
  return parts.map(p => p.text ?? '').join('').trim()
}
