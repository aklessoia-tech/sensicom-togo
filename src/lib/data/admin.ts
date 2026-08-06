import { supabase, isSupabaseConfigured } from '../supabase/client'
import { db } from '../offline/db'
import type { Genre, Profile, Thematique, TrancheAge, Universite, Zone } from '../domain/types'

export interface FiltresDashboard {
  universiteId?: string
  thematiqueId?: string
  genre?: Genre
  trancheAge?: TrancheAge
  debut?: string
  fin?: string
}

export interface Indicateurs {
  sessions: number
  presents: number
  sensibilises: number
  coupons: number
  actes: number
  /** Actes à coupon illisible ou perdu : comptés à part, hors taux de conversion. */
  actesNonRattaches: number
  depistages: number
  tauxEngagement: number
  tauxConversion: number
}

export interface PointSerie {
  cle: string
  sensibilises: number
  actes: number
}

export interface AlerteFraude {
  agent_id: string
  agent_nom: string
  date_emission: string
  nb_coupons: number
  moyenne_agent: number
  score_z: number
  motif: string
}

export interface LigneSession {
  id: string
  date_session: string
  nombre_presents: number | null
  universite_id: string
  universite_nom: string
  thematique_id: string
  thematique: string
  campus: string
  secteur: string
  nb_sensibilises: number
  nb_coupons: number
  nb_actes: number
}

interface LignePersonne {
  genre: Genre
  tranche_age: TrancheAge
  date_session: string
  universite_id: string
  thematique_id: string
  a_ete_pris_en_charge: boolean
}

function tauxSur(numerateur: number, denominateur: number): number {
  return denominateur > 0 ? Math.round((numerateur / denominateur) * 1000) / 10 : 0
}

export async function chargerSessions(filtres: FiltresDashboard): Promise<LigneSession[]> {
  if (!isSupabaseConfigured) return sessionsLocales(filtres)

  let requete = supabase.from('v_sessions_enrichies').select('*')
  if (filtres.universiteId) requete = requete.eq('universite_id', filtres.universiteId)
  if (filtres.thematiqueId) requete = requete.eq('thematique_id', filtres.thematiqueId)
  if (filtres.debut) requete = requete.gte('date_session', filtres.debut)
  if (filtres.fin) requete = requete.lte('date_session', filtres.fin)

  const { data, error } = await requete
  if (error) return []
  return data as LigneSession[]
}

export async function chargerPersonnes(filtres: FiltresDashboard): Promise<LignePersonne[]> {
  if (!isSupabaseConfigured) return personnesLocales(filtres)

  let requete = supabase.from('v_personnes_demographie').select('*')
  if (filtres.universiteId) requete = requete.eq('universite_id', filtres.universiteId)
  if (filtres.thematiqueId) requete = requete.eq('thematique_id', filtres.thematiqueId)
  if (filtres.genre) requete = requete.eq('genre', filtres.genre)
  if (filtres.trancheAge) requete = requete.eq('tranche_age', filtres.trancheAge)
  if (filtres.debut) requete = requete.gte('date_session', filtres.debut)
  if (filtres.fin) requete = requete.lte('date_session', filtres.fin)

  const { data, error } = await requete
  if (error) return []
  return data as LignePersonne[]
}

/** Actes enregistrés sans coupon rattaché, sur la période et le périmètre filtrés. */
export async function compterActesNonRattaches(filtres: FiltresDashboard): Promise<number> {
  if (!isSupabaseConfigured) return 0

  let requete = supabase.from('v_actes_non_rattaches').select('id', { count: 'exact', head: true })
  if (filtres.universiteId) requete = requete.eq('universite_id', filtres.universiteId)
  if (filtres.debut) requete = requete.gte('date_acte', filtres.debut)
  if (filtres.fin) requete = requete.lte('date_acte', filtres.fin)

  const { count, error } = await requete
  return error ? 0 : (count ?? 0)
}

export function calculerIndicateurs(
  sessions: LigneSession[],
  personnes: LignePersonne[],
  actesNonRattaches = 0,
): Indicateurs {
  const presents = sessions.reduce((n, s) => n + (s.nombre_presents ?? 0), 0)
  const sensibilises = personnes.length
  const actes = personnes.filter((p) => p.a_ete_pris_en_charge).length
  const coupons = sessions.reduce((n, s) => n + s.nb_coupons, 0)

  return {
    sessions: sessions.length,
    presents,
    sensibilises,
    coupons,
    actes,
    actesNonRattaches,
    depistages: actes,
    tauxEngagement: tauxSur(sensibilises, presents),
    tauxConversion: tauxSur(actes, sensibilises),
  }
}

export function serieParUniversite(sessions: LigneSession[]): PointSerie[] {
  const agrege = new Map<string, PointSerie>()
  for (const s of sessions) {
    const point = agrege.get(s.universite_nom) ?? { cle: s.universite_nom, sensibilises: 0, actes: 0 }
    point.sensibilises += s.nb_sensibilises
    point.actes += s.nb_actes
    agrege.set(s.universite_nom, point)
  }
  return [...agrege.values()]
}

export function serieParThematique(sessions: LigneSession[]): PointSerie[] {
  const agrege = new Map<string, PointSerie>()
  for (const s of sessions) {
    const point = agrege.get(s.thematique) ?? { cle: s.thematique, sensibilises: 0, actes: 0 }
    point.sensibilises += s.nb_sensibilises
    point.actes += s.nb_actes
    agrege.set(s.thematique, point)
  }
  return [...agrege.values()]
}

export function repartitionDemographique(personnes: LignePersonne[]): { cle: string; valeur: number }[] {
  const agrege = new Map<string, number>()
  for (const p of personnes) {
    agrege.set(p.tranche_age, (agrege.get(p.tranche_age) ?? 0) + 1)
  }
  return [...agrege.entries()].map(([cle, valeur]) => ({ cle, valeur })).sort((a, b) => a.cle.localeCompare(b.cle))
}

export async function chargerAlertesFraude(): Promise<AlerteFraude[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('v_alertes_fraude')
    .select('*')
    .order('date_emission', { ascending: false })
    .limit(50)
  if (error) return []
  return data as AlerteFraude[]
}

export async function lireSeuilsFraude(): Promise<{ volumeJour: number; ecartType: number }> {
  if (!isSupabaseConfigured) return { volumeJour: 30, ecartType: 2.5 }
  const { data } = await supabase.from('parametres').select('*')
  const map = new Map((data ?? []).map((p: { cle: string; valeur: unknown }) => [p.cle, Number(p.valeur)]))
  return {
    volumeJour: map.get('seuil_fraude_coupons_jour') ?? 30,
    ecartType: map.get('seuil_fraude_ecart_type') ?? 2.5,
  }
}

export async function enregistrerSeuilsFraude(volumeJour: number, ecartType: number): Promise<void> {
  if (!isSupabaseConfigured) return
  await supabase.from('parametres').upsert([
    { cle: 'seuil_fraude_coupons_jour', valeur: volumeJour, updated_at: new Date().toISOString() },
    { cle: 'seuil_fraude_ecart_type', valeur: ecartType, updated_at: new Date().toISOString() },
  ])
}

type TableRef = 'universites' | 'zones' | 'thematiques' | 'profiles'

export async function listerReferentiel<T>(table: TableRef): Promise<T[]> {
  if (!isSupabaseConfigured) {
    const cache = await db.referentiels.get('referentiels')
    if (!cache) return []
    if (table === 'universites') return cache.universites as T[]
    if (table === 'zones') return cache.zones as T[]
    if (table === 'thematiques') return cache.thematiques as T[]
    return []
  }
  const { data, error } = await supabase.from(table).select('*')
  return error ? [] : (data as T[])
}

export async function enregistrerReferentiel(
  table: TableRef,
  valeur: Partial<Universite | Zone | Thematique | Profile>,
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase non configuré : modification indisponible')
  const { error } = await supabase.from(table).upsert(valeur)
  if (error) throw new Error(error.message)
}

export async function supprimerReferentiel(table: TableRef, id: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase non configuré : suppression indisponible')
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// Repli hors Supabase : les données locales de l'appareil alimentent le tableau de bord,
// ce qui permet de démontrer et recetter l'interface sans backend.
async function sessionsLocales(filtres: FiltresDashboard): Promise<LigneSession[]> {
  const [sessions, personnes, coupons, actes, cache] = await Promise.all([
    db.sessions.toArray(),
    db.personnes.toArray(),
    db.coupons.toArray(),
    db.actes.toArray(),
    db.referentiels.get('referentiels'),
  ])

  const couponsAvecActe = new Set(actes.map((a) => a.coupon_id).filter(Boolean))

  return sessions
    .filter((s) => !filtres.universiteId || s.universite_id === filtres.universiteId)
    .filter((s) => !filtres.thematiqueId || s.thematique_id === filtres.thematiqueId)
    .filter((s) => !filtres.debut || s.date_session >= filtres.debut)
    .filter((s) => !filtres.fin || s.date_session <= filtres.fin)
    .map((s) => {
      const couponsSession = coupons.filter((c) => c.session_id === s.id)
      return {
        id: s.id,
        date_session: s.date_session,
        nombre_presents: s.nombre_presents,
        universite_id: s.universite_id,
        universite_nom: cache?.universites.find((u) => u.id === s.universite_id)?.nom ?? 'Inconnue',
        thematique_id: s.thematique_id,
        thematique: cache?.thematiques.find((t) => t.id === s.thematique_id)?.libelle ?? 'Inconnue',
        campus: cache?.zones.find((z) => z.id === s.zone_id)?.campus ?? 'Inconnu',
        secteur: cache?.zones.find((z) => z.id === s.zone_id)?.secteur ?? '',
        nb_sensibilises: personnes.filter((p) => p.session_id === s.id).length,
        nb_coupons: couponsSession.length,
        nb_actes: couponsSession.filter((c) => couponsAvecActe.has(c.id)).length,
      }
    })
}

async function personnesLocales(filtres: FiltresDashboard): Promise<LignePersonne[]> {
  const [sessions, personnes, coupons, actes] = await Promise.all([
    db.sessions.toArray(),
    db.personnes.toArray(),
    db.coupons.toArray(),
    db.actes.toArray(),
  ])

  const couponsAvecActe = new Set(actes.map((a) => a.coupon_id).filter(Boolean))
  const parSession = new Map(sessions.map((s) => [s.id, s]))

  return personnes
    .map((p) => {
      const session = parSession.get(p.session_id)
      const coupon = coupons.find((c) => c.personne_id === p.id)
      return {
        genre: p.genre,
        tranche_age: p.tranche_age,
        date_session: session?.date_session ?? '',
        universite_id: session?.universite_id ?? '',
        thematique_id: session?.thematique_id ?? '',
        a_ete_pris_en_charge: coupon ? couponsAvecActe.has(coupon.id) : false,
      }
    })
    .filter((p) => !filtres.universiteId || p.universite_id === filtres.universiteId)
    .filter((p) => !filtres.thematiqueId || p.thematique_id === filtres.thematiqueId)
    .filter((p) => !filtres.genre || p.genre === filtres.genre)
    .filter((p) => !filtres.trancheAge || p.tranche_age === filtres.trancheAge)
    .filter((p) => !filtres.debut || p.date_session >= filtres.debut)
    .filter((p) => !filtres.fin || p.date_session <= filtres.fin)
}

export type { LignePersonne }
