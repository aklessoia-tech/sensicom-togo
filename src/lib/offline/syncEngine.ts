import { db, type OutboxEntry, type OutboxTable } from './db'
import { supabase, isSupabaseConfigured } from '../supabase/client'

export interface SyncStatus {
  online: boolean
  syncing: boolean
  pending: number
  lastSyncAt: number | null
  lastError: string | null
}

// Les sessions doivent exister côté serveur avant les personnes et les coupons,
// et les coupons avant les actes : les clés étrangères l'imposent.
const ORDRE_TABLES: OutboxTable[] = ['sessions', 'personnes_sensibilisees', 'coupons', 'actes_medicaux']

const LOCAL_STORE: Record<OutboxTable, 'sessions' | 'personnes' | 'coupons' | 'actes'> = {
  sessions: 'sessions',
  personnes_sensibilisees: 'personnes',
  coupons: 'coupons',
  actes_medicaux: 'actes',
}

const MAX_ATTEMPTS = 8

let status: SyncStatus = {
  online: navigator.onLine,
  syncing: false,
  pending: 0,
  lastSyncAt: null,
  lastError: null,
}

const listeners = new Set<(s: SyncStatus) => void>()

function emit(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch }
  listeners.forEach((fn) => fn(status))
}

export function subscribeSync(fn: (s: SyncStatus) => void): () => void {
  listeners.add(fn)
  fn(status)
  return () => listeners.delete(fn)
}

export function getSyncStatus(): SyncStatus {
  return status
}

export async function refreshPendingCount(): Promise<void> {
  emit({ pending: await db.outbox.count() })
}

async function pushEntry(entry: OutboxEntry): Promise<void> {
  const { error } = await supabase
    .from(entry.table)
    .upsert(entry.payload, { onConflict: 'id' })

  if (error) throw new Error(error.message)

  await db.outbox.delete(entry.id)
  await db.table(LOCAL_STORE[entry.table]).update(entry.recordId, {
    syncState: 'synced',
    syncError: undefined,
  })
}

export async function flushOutbox(): Promise<void> {
  if (!isSupabaseConfigured || !navigator.onLine || status.syncing) return

  const entries = await db.outbox.toArray()
  if (entries.length === 0) {
    emit({ pending: 0, lastSyncAt: Date.now(), lastError: null })
    return
  }

  entries.sort((a, b) => {
    const byTable = ORDRE_TABLES.indexOf(a.table) - ORDRE_TABLES.indexOf(b.table)
    return byTable !== 0 ? byTable : a.createdAt - b.createdAt
  })

  emit({ syncing: true, lastError: null })
  let lastError: string | null = null

  for (const entry of entries) {
    try {
      await pushEntry(entry)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      lastError = message
      const attempts = entry.attempts + 1

      if (attempts >= MAX_ATTEMPTS) {
        await db.outbox.delete(entry.id)
        await db.table(LOCAL_STORE[entry.table]).update(entry.recordId, {
          syncState: 'error',
          syncError: message,
        })
      } else {
        await db.outbox.update(entry.id, { attempts, lastError: message })
      }

      // Un échec sur une session bloque ses enfants : on s'arrête pour
      // réessayer le lot complet au prochain passage plutôt que d'empiler les erreurs.
      if (entry.table === 'sessions') break
    }
  }

  emit({
    syncing: false,
    pending: await db.outbox.count(),
    lastSyncAt: Date.now(),
    lastError,
  })
}

let intervalId: number | undefined

export function startSyncEngine(): () => void {
  const goOnline = () => {
    emit({ online: true })
    void flushOutbox()
  }
  const goOffline = () => emit({ online: false })

  window.addEventListener('online', goOnline)
  window.addEventListener('offline', goOffline)
  intervalId = window.setInterval(() => void flushOutbox(), 60_000)

  void refreshPendingCount()
  void flushOutbox()

  return () => {
    window.removeEventListener('online', goOnline)
    window.removeEventListener('offline', goOffline)
    if (intervalId) window.clearInterval(intervalId)
  }
}
