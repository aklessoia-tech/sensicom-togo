import { db } from '../offline/db'
import { supabase, isSupabaseConfigured } from '../supabase/client'
import type { Thematique, Universite, Zone } from '../domain/types'

export interface Referentiels {
  universites: Universite[]
  zones: Zone[]
  thematiques: Thematique[]
}

const VIDE: Referentiels = { universites: [], zones: [], thematiques: [] }

export async function lireReferentielsLocaux(): Promise<Referentiels> {
  const cache = await db.referentiels.get('referentiels')
  if (!cache) return VIDE
  return { universites: cache.universites, zones: cache.zones, thematiques: cache.thematiques }
}

/** Rafraîchit le cache local depuis Supabase ; renvoie le cache existant si hors ligne. */
export async function synchroniserReferentiels(): Promise<Referentiels> {
  if (!isSupabaseConfigured || !navigator.onLine) return lireReferentielsLocaux()

  // Sans session, les politiques RLS ne renvoient aucune ligne — et sans erreur.
  // Poursuivre écraserait le cache avec du vide : les écrans perdraient leurs
  // libellés de zone jusqu'à la synchronisation suivante.
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return lireReferentielsLocaux()

  const [universites, zones, thematiques] = await Promise.all([
    supabase.from('universites').select('*').order('nom'),
    supabase.from('zones').select('*').order('campus'),
    supabase.from('thematiques').select('*').eq('active', true).order('libelle'),
  ])

  if (universites.error || zones.error || thematiques.error) return lireReferentielsLocaux()

  const donnees: Referentiels = {
    universites: universites.data as Universite[],
    zones: zones.data as Zone[],
    thematiques: thematiques.data as Thematique[],
  }

  await db.referentiels.put({ key: 'referentiels', ...donnees, fetchedAt: Date.now() })
  return donnees
}

export function zonesDeUniversite(zones: Zone[], universiteId: string | null): Zone[] {
  return universiteId ? zones.filter((z) => z.universite_id === universiteId) : []
}
