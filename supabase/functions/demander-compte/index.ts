// Demande de compte par un agent ou un infirmier, sans intervention préalable
// de l'administration.
//
// Le point d'entrée est public : c'est le prix de l'autonomie sur le terrain.
// La protection ne tient donc pas à l'accès mais à ce que le compte créé peut
// faire — rien. Il naît inactif et sans zone ; les politiques RLS s'appuyant
// sur la zone, il ne voit ni n'écrit aucune donnée tant que l'administration
// ne l'a pas validé. Un compte indésirable n'est qu'une ligne à supprimer.

import { createClient } from 'jsr:@supabase/supabase-js@2'

interface Requete {
  email: string
  mot_de_passe: string
  nom_affichage: string
  role: 'agent' | 'infirmier'
  zone_id: string | null
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

  let corps: Requete
  try {
    corps = await req.json()
  } catch {
    return reponse({ erreur: 'Corps de requête illisible' }, 400)
  }

  const email = corps.email?.trim().toLowerCase()
  if (!email || !corps.mot_de_passe || !corps.nom_affichage?.trim()) {
    return reponse({ erreur: 'Nom, adresse et mot de passe sont obligatoires' }, 400)
  }
  if (corps.mot_de_passe.length < 8) {
    return reponse({ erreur: 'Le mot de passe doit faire au moins 8 caractères' }, 400)
  }

  // Le rôle « admin » ne s'obtient jamais par ce chemin : il faudrait sinon
  // qu'un inconnu puisse se déclarer administrateur en attente de validation,
  // et une activation distraite lui ouvrirait toute la plateforme.
  if (!['agent', 'infirmier'].includes(corps.role)) {
    return reponse({ erreur: 'Rôle non autorisé pour une demande de compte' }, 400)
  }

  const admin = createClient(url, cleService)

  const { data: cree, error: erreurCreation } = await admin.auth.admin.createUser({
    email,
    password: corps.mot_de_passe,
    // Les agents de terrain n'ont pas toujours accès à leur boîte : c'est
    // l'activation par l'administration qui fait office de vérification.
    email_confirm: true,
  })

  if (erreurCreation || !cree.user) {
    const message = erreurCreation?.message ?? 'Création impossible'
    const dejaPris = /already|exist/i.test(message)
    return reponse({ erreur: dejaPris ? 'Cette adresse est déjà utilisée' : message }, 400)
  }

  // La zone demandée n'est qu'une indication pour l'administration : elle n'est
  // pas appliquée tant que le compte n'est pas activé.
  const { error: erreurProfil } = await admin.from('profiles').insert({
    id: cree.user.id,
    role: corps.role,
    nom_affichage: corps.nom_affichage.trim(),
    zone_id: corps.zone_id || null,
    universite_id: null,
    code_agent: corps.code_agent?.trim().toUpperCase() || null,
    actif: false,
  })

  if (erreurProfil) {
    await admin.auth.admin.deleteUser(cree.user.id)
    const duplique = /duplicate|unique/i.test(erreurProfil.message)
    return reponse(
      { erreur: duplique ? 'Ce code agent est déjà attribué' : erreurProfil.message },
      400,
    )
  }

  return reponse({ id: cree.user.id, en_attente: true })
})
