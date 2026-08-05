import { NavLink, Outlet } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Alerte } from '../ui/Alerte'
import { BasculeTheme } from './BasculeTheme'
import { IndicateurSync } from './IndicateurSync'

export interface EntreeNav {
  to: string
  label: string
  icone: ReactNode
}

/**
 * Navigation en barre inférieure sur mobile (agent et infirmier travaillent au pouce),
 * en colonne latérale dès le format tablette/desktop (usage administrateur).
 */
export function Coquille({ titre, nav }: { titre: string; nav: EntreeNav[] }) {
  const { profile, deconnecter, modeDemo } = useAuth()
  const [erreurSortie, setErreurSortie] = useState<string | null>(null)

  async function quitter() {
    setErreurSortie(null)
    try {
      await deconnecter()
    } catch (err) {
      setErreurSortie(err instanceof Error ? err.message : 'Déconnexion impossible')
    }
  }

  const classeLien = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-brand-700 dark:text-brand-300 md:flex-row md:gap-3 md:px-4 md:text-sm md:bg-brand-50 md:dark:bg-brand-900/40'
      : 'flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 md:flex-row md:gap-3 md:px-4 md:text-sm'

  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:block">
        <p className="px-4 text-lg font-bold text-brand-700 dark:text-brand-300">SensiCom</p>
        <p className="mb-6 px-4 text-xs text-slate-500 dark:text-slate-400">{titre}</p>
        <nav className="flex flex-col gap-1">
          {nav.map((e) => (
            <NavLink key={e.to} to={e.to} end className={classeLien}>
              {e.icone}
              {e.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile?.nom_affichage}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{titre}</p>
          </div>
          <IndicateurSync />
          <BasculeTheme />
          <button
            type="button"
            onClick={() => void quitter()}
            className="rounded-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Quitter
          </button>
        </header>

        {modeDemo && (
          <p className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Mode démonstration — les données restent sur cet appareil
          </p>
        )}

        <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-24 md:pb-6">
          {erreurSortie && (
            <div className="mb-4">
              <Alerte ton="avertissement" titre="Déconnexion bloquée">
                {erreurSortie}
              </Alerte>
            </div>
          )}
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
          {nav.map((e) => (
            <NavLink key={e.to} to={e.to} end className={classeLien}>
              {e.icone}
              {e.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
