import { db, enqueue } from '../offline/db'
import { flushOutbox, refreshPendingCount } from '../offline/syncEngine'
import { hasherTelephone, suffixeTelephone } from '../domain/telephone'
import { formaterNumeroCoupon } from '../domain/coupons'
import type {
  Coupon,
  Genre,
  Local,
  PersonneSensibilisee,
  Session,
  TrancheAge,
  Universite,
  Zone,
} from '../domain/types'

const JOURS_FENETRE_DOUBLON = 30

export interface NouvelleSession {
  agent_id: string
  universite_id: string
  zone_id: string
  thematique_id: string
  date_session: string
  nombre_presents: number | null
}

function chargeSession(s: Local<Session>) {
  return {
    id: s.id,
    agent_id: s.agent_id,
    universite_id: s.universite_id,
    zone_id: s.zone_id,
    thematique_id: s.thematique_id,
    date_session: s.date_session,
    nombre_presents: s.nombre_presents,
    cloturee_at: s.cloturee_at,
  }
}

export async function creerSession(saisie: NouvelleSession): Promise<Local<Session>> {
  // Le serveur n'accepte qu'une séance ouverte par agent : la précédente est
  // close d'office, faute de quoi la synchro rejetterait la nouvelle.
  await cloreSessionsOuvertes(saisie.agent_id)

  const session: Local<Session> = {
    id: crypto.randomUUID(),
    ...saisie,
    cloturee_at: null,
    syncState: 'pending',
    updatedLocalAt: Date.now(),
  }

  await db.sessions.put(session)
  await enqueue('sessions', session.id, chargeSession(session))

  await refreshPendingCount()
  void flushOutbox()
  return session
}

/** Clôt la séance : l'accueil agent bascule alors sur « sessions précédentes ». */
export async function cloreSession(sessionId: string): Promise<void> {
  const session = await db.sessions.get(sessionId)
  if (!session || session.cloturee_at) return

  const close: Local<Session> = {
    ...session,
    cloturee_at: new Date().toISOString(),
    syncState: 'pending',
    updatedLocalAt: Date.now(),
  }

  await db.sessions.put(close)
  await enqueue('sessions', close.id, chargeSession(close))
  await refreshPendingCount()
  void flushOutbox()
}

async function cloreSessionsOuvertes(agentId: string): Promise<void> {
  const toutes = await db.sessions.toArray()
  for (const s of toutes.filter((x) => x.agent_id === agentId && !x.cloturee_at)) {
    await cloreSession(s.id)
  }
}

/** Séance active de l'agent, sur laquelle s'ouvre son accueil. */
export async function sessionEnCours(agentId: string): Promise<Local<Session> | null> {
  const toutes = await db.sessions.toArray()
  const ouvertes = toutes
    .filter((s) => s.agent_id === agentId && !s.cloturee_at)
    .sort((a, b) => b.updatedLocalAt - a.updatedLocalAt)
  return ouvertes[0] ?? null
}

export interface ResultatDoublon {
  doublon: boolean
  joursDepuis?: number
}

/**
 * Vérification locale uniquement, sur l'empreinte du numéro : elle avertit l'agent
 * sans jamais bloquer la saisie, une même personne pouvant légitimement revenir.
 */
export async function verifierDoublon(telephone: string): Promise<ResultatDoublon> {
  const hash = await hasherTelephone(telephone)
  const correspondances = await db.personnes.where('telephone_hash').equals(hash).toArray()
  if (correspondances.length === 0) return { doublon: false }

  const plusRecente = Math.max(...correspondances.map((p) => p.updatedLocalAt))
  const joursDepuis = Math.floor((Date.now() - plusRecente) / 86_400_000)

  return joursDepuis <= JOURS_FENETRE_DOUBLON ? { doublon: true, joursDepuis } : { doublon: false }
}

export interface NouvellePersonne {
  session_id: string
  genre: Genre
  tranche_age: TrancheAge
  telephone: string
}

export async function enregistrerPersonne(saisie: NouvellePersonne): Promise<Local<PersonneSensibilisee>> {
  const personne: Local<PersonneSensibilisee> = {
    id: crypto.randomUUID(),
    session_id: saisie.session_id,
    genre: saisie.genre,
    tranche_age: saisie.tranche_age,
    telephone_hash: await hasherTelephone(saisie.telephone),
    telephone_suffixe: suffixeTelephone(saisie.telephone),
    syncState: 'pending',
    updatedLocalAt: Date.now(),
  }

  await db.personnes.put(personne)
  await enqueue('personnes_sensibilisees', personne.id, {
    id: personne.id,
    session_id: personne.session_id,
    genre: personne.genre,
    tranche_age: personne.tranche_age,
    telephone_hash: personne.telephone_hash,
    telephone_suffixe: personne.telephone_suffixe,
  })

  await refreshPendingCount()
  void flushOutbox()
  return personne
}

/** Numéro séquentiel calculé localement pour rester utilisable hors ligne. */
export async function prochainNumeroCoupon(
  universite: Universite,
  zone: Zone,
  date: string,
): Promise<string> {
  const dejaEmis = await db.coupons.where('zone_id').equals(zone.id).toArray()
  const duJour = dejaEmis.filter((c) => c.date_emission === date && !c.genere_secours)
  return formaterNumeroCoupon(universite, zone, date, duJour.length + 1)
}

export interface NouveauCoupon {
  numero: string
  session_id: string
  personne_id: string | null
  zone_id: string
  thematique_id: string
  date_emission: string
  genere_secours: boolean
}

export async function enregistrerCoupon(saisie: NouveauCoupon): Promise<Local<Coupon>> {
  const coupon: Local<Coupon> = {
    id: crypto.randomUUID(),
    ...saisie,
    numero: saisie.numero.trim().toUpperCase(),
    statut: 'emis',
    syncState: 'pending',
    updatedLocalAt: Date.now(),
  }

  await db.coupons.put(coupon)
  await enqueue('coupons', coupon.id, {
    id: coupon.id,
    numero: coupon.numero,
    session_id: coupon.session_id,
    personne_id: coupon.personne_id,
    zone_id: coupon.zone_id,
    thematique_id: coupon.thematique_id,
    date_emission: coupon.date_emission,
    statut: coupon.statut,
    genere_secours: coupon.genere_secours,
  })

  await refreshPendingCount()
  void flushOutbox()
  return coupon
}

export async function sessionsRecentes(agentId: string, limite = 20): Promise<Local<Session>[]> {
  const toutes = await db.sessions.toArray()
  return toutes
    .filter((s) => s.agent_id === agentId)
    .sort((a, b) => b.updatedLocalAt - a.updatedLocalAt)
    .slice(0, limite)
}

export async function statistiquesSession(sessionId: string) {
  const [personnes, coupons] = await Promise.all([
    db.personnes.where('session_id').equals(sessionId).count(),
    db.coupons.where('session_id').equals(sessionId).count(),
  ])
  return { personnes, coupons }
}
