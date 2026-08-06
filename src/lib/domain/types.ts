export type Role = 'agent' | 'infirmier' | 'admin'

export type Genre = 'F' | 'M' | 'autre'

export type TrancheAge = '10-14' | '15-19' | '20-24' | '25-29' | '30-39' | '40-49' | '50+'

export type TypeActe = 'depistage' | 'consultation' | 'soin' | 'orientation'

export type StatutCoupon = 'emis' | 'utilise' | 'expire'

export type SyncState = 'pending' | 'synced' | 'error'

export interface Universite {
  id: string
  nom: string
  region: string
  code: string
  created_at?: string
}

export interface Zone {
  id: string
  universite_id: string
  campus: string
  secteur: string
  code: string
  created_at?: string
}

export interface Thematique {
  id: string
  libelle: string
  code: string
  active: boolean
  created_at?: string
}

export interface Profile {
  id: string
  role: Role
  nom_affichage: string
  zone_id: string | null
  universite_id: string | null
  actif: boolean
  created_at?: string
}

export interface Session {
  id: string
  agent_id: string
  universite_id: string
  zone_id: string
  thematique_id: string
  date_session: string
  nombre_presents: number | null
  /** Renseigné quand l'agent clôt la séance : une seule reste ouverte à la fois. */
  cloturee_at: string | null
  created_at?: string
  updated_at?: string
}

/** Anonyme par construction : aucun champ d'identité civile n'existe sur cette entité. */
export interface PersonneSensibilisee {
  id: string
  session_id: string
  genre: Genre
  tranche_age: TrancheAge
  telephone_hash: string
  telephone_suffixe: string
  created_at?: string
}

export interface Coupon {
  id: string
  numero: string
  session_id: string
  personne_id: string | null
  zone_id: string
  thematique_id: string
  date_emission: string
  statut: StatutCoupon
  genere_secours: boolean
  created_at?: string
}

export interface ActeMedical {
  id: string
  infirmier_id: string
  coupon_id: string | null
  numero_coupon_saisi: string | null
  zone_id: string
  type_acte: TypeActe
  date_acte: string
  coupon_illisible: boolean
  zone_approximative: string | null
  en_attente_rapprochement: boolean
  notes: string | null
  created_at?: string
}

export interface SyncMeta {
  syncState: SyncState
  syncError?: string
  updatedLocalAt: number
}

export type Local<T> = T & SyncMeta

export const GENRES: { value: Genre; label: string }[] = [
  { value: 'F', label: 'Féminin' },
  { value: 'M', label: 'Masculin' },
  { value: 'autre', label: 'Autre / non précisé' },
]

export const TRANCHES_AGE: TrancheAge[] = ['10-14', '15-19', '20-24', '25-29', '30-39', '40-49', '50+']

export const TYPES_ACTE: { value: TypeActe; label: string }[] = [
  { value: 'depistage', label: 'Dépistage' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'soin', label: 'Soin' },
  { value: 'orientation', label: 'Orientation' },
]
