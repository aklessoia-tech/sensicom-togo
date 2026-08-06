import { useEffect, useState } from 'react'
import { flushOutbox, subscribeSync, type SyncStatus } from '../../lib/offline/syncEngine'

type Variante = 'pastille' | 'barre' | 'ligne'

const VIDE: SyncStatus = {
  online: navigator.onLine,
  syncing: false,
  pending: 0,
  lastSyncAt: null,
  lastError: null,
}

function heure(ts: number | null): string | null {
  if (!ts) return null
  const d = new Date(ts)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Trois rendus du même état : pastille d'en-tête, bandeau d'accueil, ligne de barre latérale. */
export function IndicateurSync({ variante = 'pastille' }: { variante?: Variante }) {
  const [statut, setStatut] = useState<SyncStatus>(VIDE)
  useEffect(() => subscribeSync(setStatut), [])

  const { online, syncing, pending, lastError, lastSyncAt } = statut

  const couleurPoint = !online
    ? 'bg-slate-400'
    : lastError
      ? 'bg-red-500'
      : pending > 0
        ? 'bg-amber-500'
        : 'bg-emerald-500'

  const libelle = !online
    ? `Hors ligne${pending > 0 ? ` · ${pending}` : ''}`
    : syncing
      ? 'Synchronisation…'
      : lastError
        ? 'Échec de synchro'
        : pending > 0
          ? `${pending} en attente`
          : 'À jour'

  const couleurTexte = !online
    ? 'text-slate-600 dark:text-slate-300'
    : lastError
      ? 'text-red-700 dark:text-red-300'
      : pending > 0
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-emerald-700 dark:text-emerald-300'

  if (variante === 'ligne') {
    return (
      <p className={`pastille ${couleurTexte}`}>
        <span className={`point ${couleurPoint} ${syncing ? 'animate-pulse' : ''}`} />
        {libelle}
        {online && !lastError && lastSyncAt && (
          <span className="font-medium text-slate-500 dark:text-slate-400">— {heure(lastSyncAt)}</span>
        )}
      </p>
    )
  }

  if (variante === 'barre') {
    const fond = !online
      ? 'bg-slate-100 dark:bg-slate-800/60'
      : lastError
        ? 'bg-red-50 dark:bg-red-950/40'
        : pending > 0
          ? 'bg-amber-50 dark:bg-amber-950/40'
          : 'bg-emerald-50 dark:bg-emerald-950/40'

    return (
      <div className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${fond}`}>
        <p className={`pastille ${couleurTexte}`}>
          <span className={`point ${couleurPoint} ${syncing ? 'animate-pulse' : ''}`} />
          {libelle}
          {online && !lastError && lastSyncAt && (
            <span className="font-medium text-slate-500 dark:text-slate-400">
              — dernière synchro à {heure(lastSyncAt)}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => void flushOutbox()}
          disabled={!online || syncing}
          className="shrink-0 text-[11px] font-semibold text-brand-700 underline-offset-2 hover:underline disabled:opacity-40 dark:text-brand-300"
        >
          Forcer
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void flushOutbox()}
      disabled={!online || syncing}
      title={lastError ?? 'Forcer la synchronisation'}
      className={`pastille min-h-[36px] rounded-full px-2.5 disabled:cursor-default ${couleurTexte}`}
    >
      <span className={`point ${couleurPoint} ${syncing ? 'animate-pulse' : ''}`} />
      {libelle}
    </button>
  )
}
