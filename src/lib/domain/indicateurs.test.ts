import { describe, expect, it } from 'vitest'
import {
  calculerIndicateurs,
  repartitionDemographique,
  serieParThematique,
  serieParUniversite,
  tauxSur,
  type LignePersonne,
  type LigneSession,
} from './indicateurs'

function session(p: Partial<LigneSession> = {}): LigneSession {
  return {
    id: 's1',
    date_session: '2026-08-06',
    nombre_presents: 40,
    universite_id: 'u1',
    universite_nom: 'Université de Lomé',
    thematique_id: 't1',
    thematique: 'VIH',
    campus: 'Campus Nord',
    secteur: 'Cité universitaire',
    nb_sensibilises: 10,
    nb_coupons: 10,
    nb_actes: 4,
    ...p,
  }
}

function personne(p: Partial<LignePersonne> = {}): LignePersonne {
  return {
    genre: 'F',
    tranche_age: '20-24',
    date_session: '2026-08-06',
    universite_id: 'u1',
    thematique_id: 't1',
    a_ete_pris_en_charge: false,
    ...p,
  }
}

describe('tauxSur', () => {
  it('arrondit à une décimale', () => {
    expect(tauxSur(1, 3)).toBe(33.3)
    expect(tauxSur(2, 3)).toBe(66.7)
  })

  // Une période sans présent déclaré ne doit pas produire NaN ni Infinity.
  it('renvoie 0 quand le dénominateur est nul', () => {
    expect(tauxSur(5, 0)).toBe(0)
    expect(tauxSur(0, 0)).toBe(0)
  })
})

describe('calculerIndicateurs', () => {
  it('agrège présents, sensibilisés, coupons et actes', () => {
    const i = calculerIndicateurs(
      [session({ nombre_presents: 40, nb_coupons: 10 }), session({ id: 's2', nombre_presents: 25, nb_coupons: 5 })],
      [personne({ a_ete_pris_en_charge: true }), personne(), personne()],
    )
    expect(i.sessions).toBe(2)
    expect(i.presents).toBe(65)
    expect(i.sensibilises).toBe(3)
    expect(i.coupons).toBe(15)
    expect(i.actes).toBe(1)
  })

  it('calcule engagement et conversion', () => {
    const i = calculerIndicateurs(
      [session({ nombre_presents: 100 })],
      [personne({ a_ete_pris_en_charge: true }), personne({ a_ete_pris_en_charge: true }), personne(), personne()],
    )
    expect(i.tauxEngagement).toBe(4) // 4 sensibilisés sur 100 présents
    expect(i.tauxConversion).toBe(50) // 2 pris en charge sur 4 sensibilisés
  })

  it('traite un nombre de présents non compté comme zéro', () => {
    const i = calculerIndicateurs([session({ nombre_presents: null })], [personne()])
    expect(i.presents).toBe(0)
    expect(i.tauxEngagement).toBe(0)
  })

  // Les actes à coupon illisible sont comptés à part : les inclure dans la
  // conversion la gonflerait sans qu'aucune personne sensibilisée y corresponde.
  it('tient les actes sans coupon hors du taux de conversion', () => {
    const i = calculerIndicateurs(
      [session()],
      [personne({ a_ete_pris_en_charge: true }), personne()],
      7,
    )
    expect(i.actesNonRattaches).toBe(7)
    expect(i.actes).toBe(1)
    expect(i.tauxConversion).toBe(50)
  })

  it('ne compte aucun acte ni aucune personne sur une période vide', () => {
    const i = calculerIndicateurs([], [])
    expect(i).toMatchObject({ sessions: 0, sensibilises: 0, actes: 0, tauxConversion: 0, tauxEngagement: 0 })
  })
})

describe('serieParUniversite', () => {
  it('cumule les sessions d’une même université', () => {
    const serie = serieParUniversite([
      session({ nb_sensibilises: 10, nb_actes: 4 }),
      session({ id: 's2', nb_sensibilises: 5, nb_actes: 1 }),
      session({ id: 's3', universite_nom: 'Université de Kara', nb_sensibilises: 7, nb_actes: 2 }),
    ])
    expect(serie).toHaveLength(2)
    expect(serie.find((p) => p.cle === 'Université de Lomé')).toEqual({
      cle: 'Université de Lomé',
      sensibilises: 15,
      actes: 5,
    })
  })
})

describe('serieParThematique', () => {
  it('regroupe par thématique et non par université', () => {
    const serie = serieParThematique([
      session({ thematique: 'VIH', nb_sensibilises: 3, nb_actes: 1 }),
      session({ id: 's2', universite_nom: 'Université de Kara', thematique: 'VIH', nb_sensibilises: 2, nb_actes: 1 }),
      session({ id: 's3', thematique: 'IST', nb_sensibilises: 4, nb_actes: 0 }),
    ])
    expect(serie).toHaveLength(2)
    expect(serie.find((p) => p.cle === 'VIH')).toEqual({ cle: 'VIH', sensibilises: 5, actes: 2 })
  })
})

describe('repartitionDemographique', () => {
  it('compte par tranche d’âge, dans l’ordre des tranches', () => {
    const r = repartitionDemographique([
      personne({ tranche_age: '25-29' }),
      personne({ tranche_age: '20-24' }),
      personne({ tranche_age: '20-24' }),
    ])
    expect(r).toEqual([
      { cle: '20-24', valeur: 2 },
      { cle: '25-29', valeur: 1 },
    ])
  })

  it('renvoie une liste vide sans personne', () => {
    expect(repartitionDemographique([])).toEqual([])
  })
})
