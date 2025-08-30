'use client'

// Audio utility for theme switching and other UI sounds
class AudioManager {
  private static instance: AudioManager
  private audioContext: AudioContext | null = null
  private isEnabled: boolean = true

  private constructor() {
    // Initialize audio context only in browser
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        // Resume audio context on user interaction (required by browsers)
        document.addEventListener('click', this.resumeAudioContext.bind(this), { once: true })
        document.addEventListener('keydown', this.resumeAudioContext.bind(this), { once: true })
      } catch (error) {
        console.warn('AudioContext not supported:', error)
        this.audioContext = null
      }
    }
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }

  private async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
      } catch (error) {
        console.warn('Failed to resume audio context:', error)
      }
    }
  }

  // Create a subtle click sound for theme switching
  private createThemeSwitchSound(isDarkMode: boolean): void {
    if (!this.audioContext || !this.isEnabled) return

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      // Different frequencies for light/dark mode
      const frequency = isDarkMode ? 800 : 1000 // Lower pitch for dark mode
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
      oscillator.type = 'sine'

      // Gentle volume envelope
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15)

      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + 0.15)
    } catch (error) {
      console.warn('Failed to play theme switch sound:', error)
    }
  }

  public playThemeSwitchSound(isDarkMode: boolean): void {
    this.createThemeSwitchSound(isDarkMode)
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  public isAudioEnabled(): boolean {
    return this.isEnabled && this.audioContext !== null
  }
}

export const audioManager = AudioManager.getInstance()

// Convenience function for theme switching sound
export const playThemeSwitchSound = (isDarkMode: boolean) => {
  audioManager.playThemeSwitchSound(isDarkMode)
}