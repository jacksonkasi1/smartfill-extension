'use client'

// ** import third-party packages
import { Moon, Sun } from 'lucide-react'

// ** import contexts
import { useTheme } from '@/contexts/ThemeContext'

// ** import components
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, toggleTheme, isHydrated } = useTheme()

  // Prevent hydration mismatch by showing a neutral state until hydrated
  if (!isHydrated) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="opacity-50" />
      </Button>
    )
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <Moon /> : <Sun />}
    </Button>
  )
}