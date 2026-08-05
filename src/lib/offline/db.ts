import Dexie, { type EntityTable } from 'dexie'
import type {
  ActeMedical,
  Coupon,
  Local,
  PersonneSensibilisee,
  Session,
  Thematique,
  Universite,
  Zone,
} from '../domain/types'

export type OutboxTable = 'sessions' | 'personnes_sensibilisees' | 'coupons' | 'actes_medicaux'

export interface OutboxEntry {
  id: string
  table: OutboxTable
  recordId: string
  payload: Record<string, unknown>
  createdAt: number
  attempts: number
  lastError?: string
}

export interface CachedReferentiels {
  key: 'referentiels'
  universites: Universite[]
  zones: Zone[]
  thematiques: Thematique[]
  fetchedAt: number
}

class SensiComDB extends Dexie {
  sessions!: EntityTable<Local<Session>, 'id'>
  personnes!: EntityTable<Local<PersonneSensibilisee>, 'id'>
  coupons!: EntityTable<Local<Coupon>, 'id'>
  actes!: EntityTable<Local<ActeMedical>, 'id'>
  outbox!: EntityTable<OutboxEntry, 'id'>
  referentiels!: EntityTable<CachedReferentiels, 'key'>

  constructor() {
    super('sensicom')
    this.version(1).stores({
      sessions: 'id, zone_id, date_session, syncState',
      personnes: 'id, session_id, telephone_hash, syncState',
      coupons: 'id, numero, session_id, zone_id, syncState',
      actes: 'id, coupon_id, numero_coupon_saisi, zone_id, syncState, en_attente_rapprochement',
      outbox: 'id, table, recordId, createdAt',
      referentiels: 'key',
    })
  }
}

export const db = new SensiComDB()

export async function enqueue(
  table: OutboxTable,
  recordId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await db.outbox.put({
    id: `${table}:${recordId}`,
    table,
    recordId,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  })
}

export async function clearLocalData(): Promise<void> {
  await Promise.all([
    db.sessions.clear(),
    db.personnes.clear(),
    db.coupons.clear(),
    db.actes.clear(),
    db.outbox.clear(),
    db.referentiels.clear(),
  ])
}
