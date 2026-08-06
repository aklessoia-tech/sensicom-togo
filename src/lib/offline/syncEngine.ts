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

/**
 * Erreurs que le serveur rejettera identiquement à chaque tentative : numéro de
 * coupon déjà pris, référence manquante, accès refusé. Les réessayer ne fait que
 * retarder l'alerte de l'agent, qui doit réagir tant que la personne est devant lui.
 */
const CODES_DEFINITIFS = new Set(['23505', '23503', '23514', '42501'])

// Une violation d'unicité ne veut pas dire la même chose selon la table : le
// message doit dire à l'agent quoi faire, pas nommer une contrainte Postgres.
const MESSAGES_UNICITE: Partial<Record<OutboxTable, string>> = {
  coupons: 'Ce numéro de coupon est déjà utilisé. Remettez un coupon de secours à la personne.',
  sessions: 'Une séance identique existe déjà côté serveur.',
}

const MESSAGES_DEFINITIFS: Record<string, string> = {
  '23503': 'Référence introuvable côté serveur (zone, session ou thématique supprimée).',
  '23514': 'Donnée refusée par le serveur : valeur hors des valeurs autorisées.',
  '42501': "Accès refusé : cette zone ne correspond pas à celle de votre compte.",
}

function messageDefinitif(code: string, table: OutboxTable, defaut: string): string {
  if (code === '23505') return MESSAGES_UNICITE[table] ?? defaut
  return MESSAGES_DEFINITIFS[code] ?? defaut
}

class ErreurSync extends Error {
  definitive: boolean

  constructor(message: string, definitive: boolean) {
    super(message)
    this.definitive = definitive
  }
}

async function pushEntry(entry: OutboxEntry): Promise<void> {
  const { error } = await supabase
    .from(entry.table)
    .upsert(entry.payload, { onConflict: 'id' })

  if (error) {
    const code = error.code ?? ''
    const definitive = CODES_DEFINITIFS.has(code)
    throw new ErreurSync(
      definitive ? messageDefinitif(code, entry.table, error.message) : error.message,
      definitive,
    )
  }

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
      const definitive = err instanceof ErreurSync && err.definitive

      if (definitive || attempts >= MAX_ATTEMPTS) {
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
  // L'état est relu sur navigator plutôt que déduit de l'événement : sur le
  // terrain, un « online » peut survenir alors que le lien reste inutilisable.
  const majEtatReseau = () => {
    const online = navigator.onLine
    emit({ online })
    if (online) void flushOutbox()
  }

  window.addEventListener('online', majEtatReseau)
  window.addEventListener('offline', majEtatReseau)
  intervalId = window.setInterval(() => void flushOutbox(), 60_000)

  // Le moteur peut redémarrer (changement de profil) après un basculement :
  // on réaligne le drapeau au lieu de garder celui figé au chargement du module.
  majEtatReseau()
  void refreshPendingCount()

  return () => {
    window.removeEventListener('online', majEtatReseau)
    window.removeEventListener('offline', majEtatReseau)
    if (intervalId) window.clearInterval(intervalId)
  }
}
