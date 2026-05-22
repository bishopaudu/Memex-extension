import { useState, useEffect } from 'react'

type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Read from localStorage on first load
    return (localStorage.getItem('memex_theme') as Theme) ?? 'dark'
  })

  useEffect(() => {
    // Apply theme class to html element
    const html = document.documentElement
    if (theme === 'light') {
      html.classList.add('light')
    } else {
      html.classList.remove('light')
    }
    localStorage.setItem('memex_theme', theme)
  }, [theme])

  function toggle() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return { theme, toggle }
}
