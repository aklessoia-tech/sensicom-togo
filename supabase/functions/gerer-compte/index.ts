// Suppression d'un compte et réinitialisation de mot de passe par l'administration.
//
// Les deux opérations touchent auth.users, qui n'est accessible qu'avec la clé
// de service : impossible depuis le navigateur. Supprimer seulement la ligne
// profiles laisserait un compte fantôme capable de s'authentifier, et son
// adresse resterait prise.

import { createClient } from 'jsr:@supabase/supabase-js@2'

interface Requete {
  action: 'supprimer' | 'reinitialiser'
  compte_id: string
  mot_de_passe?: string
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function reponse(corps: unknown, status = 200): Response {
  return new Response(JSON.stringify(corps), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reponse({ erreur: 'Méthode non autorisée' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const cleService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !cleService) return reponse({ erreur: 'Fonction mal configurée' }, 500)

  const jeton = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jeton) return reponse({ erreur: 'Authentification requise' }, 401)

  const admin = createClient(url, cleService)

  const { data: auteur, error: erreurJeton } = await admin.auth.getUser(jeton)
  if (erreurJeton || !auteur.user) return reponse({ erreur: 'Session invalide' }, 401)

  const { data: profilAuteur } = await admin
    .from('profiles')
    .select('role, actif')
    .eq('id', auteur.user.id)
    .maybeSingle()

  if (profilAuteur?.role !== 'admin' || !profilAuteur.actif) {
    return reponse({ erreur: 'Réservé aux administrateurs' }, 403)
  }

  let corps: Requete
  try {
    corps = await req.json()
  } catch {
    return reponse({ erreur: 'Corps de requête illisible' }, 400)
  }

  if (!corps.compte_id) return reponse({ erreur: 'Compte non précisé' }, 400)

  if (corps.action === 'reinitialiser') {
    if (!corps.mot_de_passe || corps.mot_de_passe.length < 8) {
      return reponse({ erreur: 'Le mot de passe doit faire au moins 8 caractères' }, 400)
    }
    const { error } = await admin.auth.admin.updateUserById(corps.compte_id, {
      password: corps.mot_de_passe,
    })
    if (error) return reponse({ erreur: error.message }, 400)
    return reponse({ ok: true })
  }

  if (corps.action === 'supprimer') {
    // Un administrateur qui se supprime lui-même perdrait la main sur la
    // plateforme, éventuellement sans qu'il reste quiconque pour la reprendre.
    if (corps.compte_id === auteur.user.id) {
      return reponse({ erreur: 'Vous ne pouvez pas supprimer votre propre compte' }, 400)
    }

    const { error } = await admin.auth.admin.deleteUser(corps.compte_id)

    if (error) {
      // Les sessions référencent l'agent en « delete restrict » : ses données
      // ne doivent pas disparaître avec lui. Désactiver est alors la bonne issue.
      const rattache = /violates foreign key|restrict/i.test(error.message)
      return reponse(
        {
          erreur: rattache
            ? 'Ce compte a déjà enregistré des données : il ne peut pas être supprimé sans les perdre. Désactivez-le plutôt.'
            : error.message,
        },
        400,
      )
    }
    return reponse({ ok: true })
  }

  return reponse({ erreur: 'Action inconnue' }, 400)
})
