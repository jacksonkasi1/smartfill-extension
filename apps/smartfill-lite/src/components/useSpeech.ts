// ** import core packages
import { useEffect, useRef, useState } from "react"

type SpeechCtor = new () => any

function speechCtor(): SpeechCtor | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
}

/**
 * Dictation via the Web Speech API. Extension popups cannot show the
 * microphone permission prompt, so a `not-allowed` error is surfaced
 * and the caller sends the user to the options page to grant it once
 * (the grant is per extension origin and then works in the popup).
 */
export function useSpeech(onText: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognition = useRef<any>(null)
  const callback = useRef(onText)
  callback.current = onText

  useEffect(() => () => recognition.current?.abort(), [])

  const supported = Boolean(speechCtor())

  function start() {
    const Ctor = speechCtor()
    if (!Ctor) return
    setError(null)
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
      setError(event.error === 'no-speech' ? null : event.error)
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recognition.current = rec
    rec.start()
    setListening(true)
  }

  function toggle() {
    if (listening) recognition.current?.stop()
    else start()
  }

  return { supported, listening, error, toggle }
}
