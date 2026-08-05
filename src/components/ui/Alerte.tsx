import type { ReactNode } from 'react'

type Ton = 'info' | 'succes' | 'avertissement' | 'erreur'

const STYLES: Record<Ton, string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
  succes:
    'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  avertissement:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  erreur: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200',
}

export function Alerte({ ton = 'info', titre, children }: { ton?: Ton; titre?: string; children: ReactNode }) {
  return (
    <div role={ton === 'erreur' ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${STYLES[ton]}`}>
      {titre && <p className="mb-0.5 font-semibold">{titre}</p>}
      {children}
    </div>
  )
}
