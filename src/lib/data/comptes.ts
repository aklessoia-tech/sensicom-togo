import { supabase, isSupabaseConfigured } from '../supabase/client'
import type { Role } from '../domain/types'

export interface DemandeCompte {
  email: string
  mot_de_passe: string
  nom_affichage: string
  role: Role
  zone_id: string | null
  code_agent: string | null
}

/** Le corps de la réponse porte le motif exact ; le SDK ne dirait que « non-2xx ». */
async function motifDeLErreur(error: unknown, defaut: string): Promise<string> {
  const detail = await (error as { context?: Response }).context
    ?.json()
    .then((c: { erreur?: string }) => c?.erreur)
    .catch(() => undefined)
  return detail ?? defaut
}

/**
 * Demande de compte par la personne elle-même. Le compte est créé inactif :
 * l'administration l'active et lui attribue sa zone.
 */
export async function demanderCompte(demande: DemandeCompte): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase non configuré : demande indisponible')

  const { data, error } = await supabase.functions.invoke('demander-compte', { body: demande })

  if (error) throw new Error(await motifDeLErreur(error, error.message))
  if ((data as { erreur?: string })?.erreur) throw new Error((data as { erreur: string }).erreur)
}
