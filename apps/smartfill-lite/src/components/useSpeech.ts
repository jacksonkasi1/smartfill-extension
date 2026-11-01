// ** import core packages
import { useEffect, useRef, useState } from "react"

// ** import types
import type { VoicePlan } from "@/lib/settings"

// ** import apis
import { transcribe } from "@/api/voice/transcribe"

// ** import constants
import { VOICE_PROVIDERS } from "@/api/voice/constants"

type SpeechCtor = new () => any

function speechCtor(): SpeechCtor | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
}

// Brave (and some Chromium builds) expose the API but have no speech
// service behind it, so every attempt fails with "network". Remember
// that for the session and go straight to recording next time.
const WEB_SPEECH_BROKEN = 'smartfill.webSpeechBroken'

function webSpeechBroken(): boolean {
  try { return sessionStorage.getItem(WEB_SPEECH_BROKEN) === '1' } catch { return false }
}

function markWebSpeechBroken() {
  try { sessionStorage.setItem(WEB_SPEECH_BROKEN, '1') } catch { /* private mode */ }
}

const MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked.',
  'service-not-allowed': 'Microphone access is blocked.',
  'audio-capture': 'No microphone was found.',
  'no-transcriber': 'This browser blocks the built-in speech service (Brave does). Pick a speech-to-text service under Voice input in Settings, or use Chrome or Edge.',
  'no-key': 'The chosen voice service has no API key yet. Add it under Voice input in Settings.'
}

/**
 * Dictation. Depending on the plan it uses the Web Speech API, a
 * speech-to-text service (Groq, OpenAI, ElevenLabs, Deepgram, …), or
 * the browser first with the service as fallback. Extension popups cannot show the microphone permission
 * prompt, so a `not-allowed` error sends the user to the options page
 * to grant it once for the extension origin.
 */
export function useSpeech(onText: (text: string) => void, plan: VoicePlan = { mode: 'auto' }) {
  const [listening, setListening] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState('')
  const target = plan.target
  const recognition = useRef<any>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const callback = useRef(onText)
  callback.current = onText

  useEffect(() => () => {
    recognition.current?.abort()
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }, [])

  const canRecord = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined'
  const supported = plan.mode === 'cloud' ? canRecord : Boolean(speechCtor()) || (canRecord && Boolean(target))

  function startWebSpeech() {
    const Ctor = speechCtor()
    if (!Ctor) return startRecording()
    const rec = new Ctor()
    rec.lang = navigator.language || 'en-US'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) callback.current(event.results[i][0].transcript.trim())
      }
    }
    rec.onerror = (event: any) => {
      setListening(false)
      if (event.error === 'no-speech' || event.error === 'aborted') return
      if (event.error === 'network') {
        markWebSpeechBroken()
        if (plan.mode === 'auto' && target && canRecord) {
          startRecording()
          return
        }
        setError('no-transcriber')
        return
      }
      setError(event.error)
    }
    rec.onend = () => setListening(false)
    recognition.current = rec
    rec.start()
    setListening(true)
  }

  async function startRecording() {
    if (!target || !canRecord) {
      setError(plan.mode === 'cloud' ? 'no-key' : 'no-transcriber')
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      setError(e instanceof DOMException && e.name === 'NotFoundError' ? 'audio-capture' : 'not-allowed')
      return
    }
    const chunks: Blob[] = []
    const rec = new MediaRecorder(stream)
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      setListening(false)
      if (chunks.length === 0) return
      setTranscribing(true)
      try {
        const text = await transcribe(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }), target)
        if (text) callback.current(text)
      } catch (e) {
        setDetail(e instanceof Error ? e.message : 'Transcription failed.')
        setError('transcription-failed')
      } finally {
        setTranscribing(false)
      }
    }
    recorder.current = rec
    rec.start()
    setListening(true)
  }

  function toggle() {
    if (listening) {
      recognition.current?.stop()
      if (recorder.current?.state === 'recording') recorder.current.stop()
      return
    }
    setError(null)
    if (plan.mode === 'cloud') startRecording()
    else if (plan.mode === 'auto' && (webSpeechBroken() || !speechCtor())) startRecording()
    else startWebSpeech()
  }

  const message = error === 'transcription-failed'
    ? `${target ? VOICE_PROVIDERS[target.provider].name : 'Voice'}: ${detail}`
    : error ? MESSAGES[error] ?? `Voice input stopped (${error}).` : null
  return { supported, listening, transcribing, error, message, toggle }
}
