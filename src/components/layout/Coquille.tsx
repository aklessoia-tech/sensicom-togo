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
  /** Compteur affiché en pastille, par exemple le nombre d'alertes en cours. */
  badge?: number
}

/**
 * Navigation en barre inférieure sur mobile (agent et infirmier travaillent au pouce),
 * en colonne latérale dès le format tablette/desktop (usage administrateur).
 */
export function Coquille({
  titre,
  nav,
  perimetre,
}: {
  titre: string
  nav: EntreeNav[]
  perimetre?: string
}) {
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

  const lienLateral = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60'
    }`

  const lienBas = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors ${
      isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'
    }`

  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2 pt-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            SC
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-tight">SensiCom</span>
            <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{titre}</span>
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((e) => (
            <NavLink key={e.to} to={e.to} end className={lienLateral}>
              {e.icone}
              <span className="flex-1">{e.label}</span>
              {e.badge ? (
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                  {e.badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t border-slate-200 px-2 pt-3 dark:border-slate-800">
          <IndicateurSync variante="ligne" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile?.nom_affichage}</p>
            {perimetre && (
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{perimetre}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void quitter()}
              className="btn-secondary min-h-[38px] flex-1 text-xs"
            >
              Quitter
            </button>
            <BasculeTheme />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 md:hidden">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-[11px] font-bold text-white">
            SC
          </span>
          <p className="surtitre min-w-0 flex-1 truncate">{titre}</p>
          <IndicateurSync />
          <button
            type="button"
            onClick={() => void quitter()}
            className="shrink-0 rounded-full px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            Quitter
          </button>
        </header>

        {modeDemo && (
          <p className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Mode démonstration — les données restent sur cet appareil
          </p>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 md:pb-6">
          {erreurSortie && (
            <div className="mb-4">
              <Alerte ton="avertissement" titre="Déconnexion bloquée">
                {erreurSortie}
              </Alerte>
            </div>
          )}
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
          {nav.map((e) => (
            <NavLink key={e.to} to={e.to} end className={lienBas}>
              <span className="relative">
                {e.icone}
                {e.badge ? (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {e.badge}
                  </span>
                ) : null}
              </span>
              {e.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
