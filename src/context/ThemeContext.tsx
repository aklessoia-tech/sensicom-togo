import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeValue {
  theme: Theme
  basculer: () => void
}

const ThemeContext = createContext<ThemeValue | null>(null)
const CLE = 'sensicom-theme'

function themeInitial(): Theme {
  const stocke = localStorage.getItem(CLE)
  if (stocke === 'light' || stocke === 'dark') return stocke
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(themeInitial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Tant que l'utilisateur n'a pas choisi explicitement, on suit l'OS en direct.
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(CLE)) setTheme(e.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const basculer = useCallback(() => {
    setTheme((actuel) => {
      const suivant = actuel === 'dark' ? 'light' : 'dark'
      localStorage.setItem(CLE, suivant)
      return suivant
    })
  }, [])

  return <ThemeContext.Provider value={{ theme, basculer }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme doit être utilisé dans ThemeProvider')
  return value
}
