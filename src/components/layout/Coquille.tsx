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
  /** Rouge par défaut ; bleu pour un simple décompte, sans anomalie. */
  tonBadge?: 'alerte' | 'info'
}

/**
 * Deux gabarits. « mobile » garde la barre basse à toutes les tailles : l'agent
 * travaille debout, au pouce, et n'a que faire d'une console. « console » passe
 * en barre latérale dès `md:` pour l'infirmerie et l'administration, qui sont
 * assises devant un écran de PC.
 */
export function Coquille({
  titre,
  nav,
  perimetre,
  gabarit = 'console',
  encartLateral,
}: {
  titre: string
  nav: EntreeNav[]
  perimetre?: string
  gabarit?: 'mobile' | 'console'
  encartLateral?: ReactNode
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

  const console_ = gabarit === 'console'

  function Badge({ e, flottant = false }: { e: EntreeNav; flottant?: boolean }) {
    if (!e.badge) return null
    const ton =
      e.tonBadge === 'info'
        ? 'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200'
        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
    return flottant ? (
      <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
        {e.badge}
      </span>
    ) : (
      <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${ton}`}>{e.badge}</span>
    )
  }

  const lienLateral = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-sm transition-colors duration-150 ${
      isActive
        ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
        : 'font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60'
    }`

  const lienBas = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[10px] text-[11px] font-medium transition-colors ${
      isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'
    }`

  return (
    <div className={`min-h-dvh bg-white dark:bg-slate-950 ${console_ ? 'md:flex' : ''}`}>
      {console_ && (
        <aside className="hidden w-[264px] shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-900 md:flex">
          <div className="flex items-center gap-2.5">
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-brand-600 text-sm font-bold text-white">
              SC
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold leading-tight text-brand-700 dark:text-brand-300">
                SensiCom
              </span>
              <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                {titre}
              </span>
            </span>
          </div>

          <nav className="mt-7 flex flex-col gap-1">
            {nav.map((e) => (
              <NavLink key={e.to} to={e.to} end className={lienLateral}>
                {e.icone}
                <span className="flex-1">{e.label}</span>
                <Badge e={e} />
              </NavLink>
            ))}
          </nav>

          {encartLateral && <div className="mt-6">{encartLateral}</div>}

          <div className="mt-auto space-y-3 pt-6">
            <IndicateurSync variante="ligne" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{profile?.nom_affichage}</p>
              {perimetre && (
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{perimetre}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void quitter()}
                className="btn-secondary !min-h-[36px] flex-1 !rounded-[9px] text-xs"
              >
                Quitter
              </button>
              <BasculeTheme />
            </div>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-10 flex items-center gap-2.5 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 ${
            console_ ? 'md:hidden' : ''
          }`}
        >
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-brand-600 text-[11px] font-bold text-white">
            SC
          </span>
          <p className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {titre}
          </p>
          <IndicateurSync />
          {!console_ && <BasculeTheme />}
          <button
            type="button"
            onClick={() => void quitter()}
            className="shrink-0 rounded-full px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            Quitter
          </button>
        </header>

        {modeDemo && (
          <p className="bg-amber-100 px-4 py-1.5 text-center text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Mode démonstration — les données restent sur cet appareil
          </p>
        )}

        <main
          className={
            console_
              ? 'mx-auto w-full max-w-[1400px] flex-1 px-4 pb-24 pt-4 md:bg-slate-50 md:px-6 md:pb-6 md:pt-[22px] md:dark:bg-slate-950'
              : 'mx-auto w-full max-w-lg flex-1 px-5 pb-24 pt-5'
          }
        >
          {erreurSortie && (
            <div className="mb-4">
              <Alerte ton="avertissement" titre="Déconnexion bloquée">
                {erreurSortie}
              </Alerte>
            </div>
          )}
          <Outlet />
        </main>

        <nav
          className={`fixed inset-x-0 bottom-0 z-10 flex gap-1 border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 ${
            console_ ? 'md:hidden' : ''
          }`}
        >
          {nav.map((e) => (
            <NavLink key={e.to} to={e.to} end className={lienBas}>
              <span className="relative">
                {e.icone}
                <Badge e={e} flottant />
              </span>
              {e.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
