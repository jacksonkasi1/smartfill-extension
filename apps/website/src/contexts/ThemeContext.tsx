'use client'

// ** import core packages
import { createContext, useContext, useEffect, useState } from 'react'
// ** import utilities
import { playThemeSwitchSound } from '@/lib/audio'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isHydrated: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [isHydrated, setIsHydrated] = useState(false)

  // Initialize theme from localStorage and system preference
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme') as Theme
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setTheme(savedTheme)
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const systemTheme = prefersDark ? 'dark' : 'light'
        setTheme(systemTheme)
        localStorage.setItem('theme', systemTheme)
      }
    } catch (error) {
      console.warn('Failed to access localStorage for theme:', error)
      // Fallback to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    }
    setIsHydrated(true)
  }, [])

  // Apply theme changes to DOM and localStorage
  useEffect(() => {
    if (!isHydrated) return
    
    try {
      localStorage.setItem('theme', theme)
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error)
    }
    
    // Apply theme class to document
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme, isHydrated])

  // Listen for system theme changes
  useEffect(() => {
    if (!isHydrated) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't explicitly set a theme preference
      try {
        const savedTheme = localStorage.getItem('theme')
        if (!savedTheme) {
          const newTheme = e.matches ? 'dark' : 'light'
          setTheme(newTheme)
        }
      } catch (error) {
        console.warn('Failed to handle system theme change:', error)
      }
    }

    // Add listener for system theme changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemThemeChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange)
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleSystemThemeChange)
      }
    }
  }, [isHydrated])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    
    // Play sound effect
    try {
      playThemeSwitchSound(newTheme === 'dark')
    } catch (error) {
      console.warn('Failed to play theme switch sound:', error)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isHydrated }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}