import { supabase, isSupabaseConfigured } from '../supabase/client'
import { traduireErreurAuth } from '../domain/erreursAuth'
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
  // Les messages de la fonction sont déjà en français ; ceux qui remontent
  // directement de Supabase ne le sont pas.
  return traduireErreurAuth(detail ?? defaut)
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

async function gerer(corps: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase non configuré : action indisponible')

  const { data, error } = await supabase.functions.invoke('gerer-compte', { body: corps })

  if (error) throw new Error(await motifDeLErreur(error, error.message))
  if ((data as { erreur?: string })?.erreur) throw new Error((data as { erreur: string }).erreur)
}

/**
 * Supprime le compte d'authentification ; le profil suit par cascade. Retirer
 * seulement le profil laisserait un compte capable de s'authentifier et une
 * adresse toujours prise.
 */
export async function supprimerCompte(compteId: string): Promise<void> {
  await gerer({ action: 'supprimer', compte_id: compteId })
}

/** L'administration redonne la main à quelqu'un qui a perdu son mot de passe. */
export async function reinitialiserMotDePasse(compteId: string, motDePasse: string): Promise<void> {
  await gerer({ action: 'reinitialiser', compte_id: compteId, mot_de_passe: motDePasse })
}
