import { useEffect, useState } from 'react'
import { flushOutbox, subscribeSync, type SyncStatus } from '../../lib/offline/syncEngine'

export function IndicateurSync({ compact = false }: { compact?: boolean }) {
  const [statut, setStatut] = useState<SyncStatus>({
    online: navigator.onLine,
    syncing: false,
    pending: 0,
    lastSyncAt: null,
    lastError: null,
  })

  useEffect(() => subscribeSync(setStatut), [])

  const { online, syncing, pending, lastError } = statut

  const ton = !online
    ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    : lastError
      ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
      : pending > 0
        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'

  const libelle = !online
    ? `Hors ligne${pending > 0 ? ` · ${pending}` : ''}`
    : syncing
      ? 'Synchronisation…'
      : lastError
        ? 'Échec de synchro'
        : pending > 0
          ? `${pending} en attente`
          : 'À jour'

  return (
    <button
      type="button"
      onClick={() => void flushOutbox()}
      disabled={!online || syncing}
      title={lastError ?? 'Forcer la synchronisation'}
      className={`inline-flex min-h-[36px] items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default ${ton}`}
    >
      <span
        aria-hidden
        className={`h-2 w-2 rounded-full ${
          !online ? 'bg-slate-500' : lastError ? 'bg-red-500' : pending > 0 ? 'bg-amber-500' : 'bg-emerald-500'
        } ${syncing ? 'animate-pulse' : ''}`}
      />
      {compact ? (pending > 0 ? String(pending) : '') : libelle}
      <span className="sr-only">{libelle}</span>
    </button>
  )
}
