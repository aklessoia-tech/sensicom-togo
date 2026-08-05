/**
 * Mode démonstration : actif uniquement tant que Supabase n'est pas configuré.
 * Il permet de faire tourner l'application entièrement hors ligne (formation des
 * agents, recette de l'interface) sans jamais toucher à un backend.
 */
import { db } from '../offline/db'
import type { Profile, Thematique, Universite, Zone } from '../domain/types'

export const COMPTES_DEMO: Record<string, Profile> = {
  'agent@demo.tg': {
    id: '11111111-1111-4111-8111-111111111111',
    role: 'agent',
    nom_affichage: 'Agent démonstration',
    zone_id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    universite_id: 'ffffffff-1111-4111-8111-ffffffffffff',
    actif: true,
  },
  'infirmier@demo.tg': {
    id: '22222222-2222-4222-8222-222222222222',
    role: 'infirmier',
    nom_affichage: 'Infirmier démonstration',
    zone_id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    universite_id: 'ffffffff-1111-4111-8111-ffffffffffff',
    actif: true,
  },
  'admin@demo.tg': {
    id: '33333333-3333-4333-8333-333333333333',
    role: 'admin',
    nom_affichage: 'Administrateur démonstration',
    zone_id: null,
    universite_id: null,
    actif: true,
  },
}

export const MOT_DE_PASSE_DEMO = 'demo1234'

const UNIVERSITES_DEMO: Universite[] = [
  { id: 'ffffffff-1111-4111-8111-ffffffffffff', nom: 'Université de Lomé', region: 'Maritime', code: 'UL' },
  { id: 'ffffffff-2222-4222-8222-ffffffffffff', nom: 'Université de Kara', region: 'Kara', code: 'UK' },
]

const ZONES_DEMO: Zone[] = [
  {
    id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    universite_id: 'ffffffff-1111-4111-8111-ffffffffffff',
    campus: 'Campus Nord',
    secteur: 'Cité universitaire',
    code: 'UL-N-CITE',
  },
  {
    id: 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa',
    universite_id: 'ffffffff-1111-4111-8111-ffffffffffff',
    campus: 'Campus Nord',
    secteur: 'Amphithéâtres',
    code: 'UL-N-AMPHI',
  },
  {
    id: 'aaaaaaaa-3333-4333-8333-aaaaaaaaaaaa',
    universite_id: 'ffffffff-1111-4111-8111-ffffffffffff',
    campus: 'Campus Sud',
    secteur: 'Facultés',
    code: 'UL-S-FAC',
  },
  {
    id: 'aaaaaaaa-4444-4444-8444-aaaaaaaaaaaa',
    universite_id: 'ffffffff-2222-4222-8222-ffffffffffff',
    campus: 'Campus principal',
    secteur: 'Cité universitaire',
    code: 'UK-P-CITE',
  },
]

const THEMATIQUES_DEMO: Thematique[] = [
  { id: 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb', libelle: 'VIH', code: 'VIH', active: true },
  { id: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', libelle: 'IST', code: 'IST', active: true },
  { id: 'bbbbbbbb-3333-4333-8333-bbbbbbbbbbbb', libelle: 'MST', code: 'MST', active: true },
  {
    id: 'bbbbbbbb-4444-4444-8444-bbbbbbbbbbbb',
    libelle: 'Santé sexuelle et reproductive',
    code: 'SSR',
    active: true,
  },
]

export async function amorcerReferentielsDemo(): Promise<void> {
  const existant = await db.referentiels.get('referentiels')
  if (existant) return

  await db.referentiels.put({
    key: 'referentiels',
    universites: UNIVERSITES_DEMO,
    zones: ZONES_DEMO,
    thematiques: THEMATIQUES_DEMO,
    fetchedAt: Date.now(),
  })
}
