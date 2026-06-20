import { useEffect } from 'react'

// Single theme — navy blue palette
// No toggle needed anymore
export function useTheme() {
  useEffect(() => {
    // Remove any legacy light class
    document.documentElement.classList.remove('light')
  }, [])

  return {
    theme:  'dark' as const,
    toggle: () => {}, // no-op — single theme
  }
}
