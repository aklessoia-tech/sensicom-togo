// Création d'un compte agent ou infirmier par l'administration.
//
// Créer un utilisateur exige la clé de service, qui ne doit jamais atteindre le
// navigateur : l'opération passe donc par ici. L'appelant est vérifié à partir de
// son jeton, et seul un profil « admin » est autorisé — sans quoi n'importe quel
// agent connecté pourrait se fabriquer un compte administrateur.

import { createClient } from 'jsr:@supabase/supabase-js@2'

interface Requete {
  email: string
  mot_de_passe: string
  nom_affichage: string
  role: 'agent' | 'infirmier' | 'admin'
  zone_id: string | null
  universite_id: string | null
  code_agent: string | null
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

  // 1. Qui appelle ?
  const { data: auteur, error: erreurJeton } = await admin.auth.getUser(jeton)
  if (erreurJeton || !auteur.user) return reponse({ erreur: 'Session invalide' }, 401)

  // 2. Est-il administrateur ? Le rôle est lu en base, jamais pris dans la requête.
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

  const email = corps.email?.trim().toLowerCase()
  if (!email || !corps.mot_de_passe || !corps.nom_affichage?.trim()) {
    return reponse({ erreur: 'Adresse, mot de passe et nom sont obligatoires' }, 400)
  }
  if (corps.mot_de_passe.length < 8) {
    return reponse({ erreur: 'Le mot de passe doit faire au moins 8 caractères' }, 400)
  }
  if (!['agent', 'infirmier', 'admin'].includes(corps.role)) {
    return reponse({ erreur: 'Rôle inconnu' }, 400)
  }

  // 3. Création du compte, e-mail confirmé d'office : les agents de terrain n'ont
  // pas toujours accès à leur boîte, et l'accès est déjà validé par l'administration.
  const { data: cree, error: erreurCreation } = await admin.auth.admin.createUser({
    email,
    password: corps.mot_de_passe,
    email_confirm: true,
  })

  if (erreurCreation || !cree.user) {
    const message = erreurCreation?.message ?? 'Création impossible'
    const dejaPris = /already|exist/i.test(message)
    return reponse({ erreur: dejaPris ? 'Cette adresse est déjà utilisée' : message }, 400)
  }

  const { error: erreurProfil } = await admin.from('profiles').insert({
    id: cree.user.id,
    role: corps.role,
    nom_affichage: corps.nom_affichage.trim(),
    zone_id: corps.zone_id || null,
    universite_id: corps.universite_id || null,
    code_agent: corps.code_agent?.trim().toUpperCase() || null,
    actif: true,
  })

  // Un compte sans profil serait inutilisable et invisible dans l'administration :
  // on annule la création plutôt que de laisser un orphelin.
  if (erreurProfil) {
    await admin.auth.admin.deleteUser(cree.user.id)
    const codeDuplique = /duplicate|unique/i.test(erreurProfil.message)
    return reponse(
      { erreur: codeDuplique ? 'Ce code agent est déjà attribué' : erreurProfil.message },
      400,
    )
  }

  return reponse({ id: cree.user.id, email })
})
