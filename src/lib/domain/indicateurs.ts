import type { Genre, TrancheAge } from './types'

/**
 * Calculs du tableau de bord, sans aucun accès aux données : ils sont donc
 * exerçables directement en test, alors que la couche `data/admin` dépend de
 * Supabase et d'IndexedDB.
 */

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

export interface LignePersonne {
  genre: Genre
  tranche_age: TrancheAge
  date_session: string
  universite_id: string
  thematique_id: string
  a_ete_pris_en_charge: boolean
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

/** Pourcentage à une décimale ; un dénominateur nul donne 0 plutôt qu'une division impossible. */
export function tauxSur(numerateur: number, denominateur: number): number {
  return denominateur > 0 ? Math.round((numerateur / denominateur) * 1000) / 10 : 0
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

function agregerPar(sessions: LigneSession[], cle: (s: LigneSession) => string): PointSerie[] {
  const agrege = new Map<string, PointSerie>()
  for (const s of sessions) {
    const k = cle(s)
    const point = agrege.get(k) ?? { cle: k, sensibilises: 0, actes: 0 }
    point.sensibilises += s.nb_sensibilises
    point.actes += s.nb_actes
    agrege.set(k, point)
  }
  return [...agrege.values()]
}

export function serieParUniversite(sessions: LigneSession[]): PointSerie[] {
  return agregerPar(sessions, (s) => s.universite_nom)
}

export function serieParThematique(sessions: LigneSession[]): PointSerie[] {
  return agregerPar(sessions, (s) => s.thematique)
}

export function repartitionDemographique(
  personnes: LignePersonne[],
): { cle: string; valeur: number }[] {
  const agrege = new Map<string, number>()
  for (const p of personnes) {
    agrege.set(p.tranche_age, (agrege.get(p.tranche_age) ?? 0) + 1)
  }
  return [...agrege.entries()]
    .map(([cle, valeur]) => ({ cle, valeur }))
    .sort((a, b) => a.cle.localeCompare(b.cle))
}
