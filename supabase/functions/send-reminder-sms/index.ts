// Envoi du SMS de rappel invitant la personne sensibilisée à se présenter
// à l'infirmerie avec son coupon.
//
// Le numéro transite ici mais n'est jamais journalisé ni persisté : c'est la
// seule étape de la chaîne où il existe en clair côté serveur.

import { createClient } from 'jsr:@supabase/supabase-js@2'

interface Requete {
  telephone: string
  numero_coupon: string
  zone_libelle: string
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function normaliserE164(brut: string): string | null {
  const chiffres = brut.replace(/\D/g, '')
  const national = chiffres.startsWith('228') ? chiffres.slice(3) : chiffres
  return national.length === 8 ? `+228${national}` : null
}

function reponse(corps: unknown, status = 200): Response {
  return new Response(JSON.stringify(corps), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reponse({ error: 'Méthode non autorisée' }, 405)

  // Seul un utilisateur authentifié peut déclencher un envoi.
  const authorization = req.headers.get('Authorization')
  if (!authorization) return reponse({ error: 'Non authentifié' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authorization } } },
  )

  const { data: utilisateur } = await supabase.auth.getUser()
  if (!utilisateur.user) return reponse({ error: 'Non authentifié' }, 401)

  let corps: Requete
  try {
    corps = await req.json()
  } catch {
    return reponse({ error: 'Corps de requête invalide' }, 400)
  }

  const destinataire = normaliserE164(corps.telephone ?? '')
  if (!destinataire) return reponse({ error: 'Numéro de téléphone invalide' }, 400)
  if (!corps.numero_coupon) return reponse({ error: 'Numéro de coupon manquant' }, 400)

  const message =
    `Merci pour votre participation. Presentez-vous a l'infirmerie de ${corps.zone_libelle} ` +
    `avec votre coupon ${corps.numero_coupon} pour un depistage gratuit et confidentiel.`

  const apiUrl = Deno.env.get('SMS_API_URL')
  const apiKey = Deno.env.get('SMS_API_KEY')
  const expediteur = Deno.env.get('SMS_SENDER_ID') ?? 'SensiCom'

  if (!apiUrl || !apiKey) {
    return reponse({ error: 'Passerelle SMS non configurée' }, 503)
  }

  const envoi = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ to: destinataire, from: expediteur, message }),
  })

  if (!envoi.ok) {
    // Le corps de la réponse peut contenir le numéro : on ne remonte que le statut.
    return reponse({ error: 'Envoi refusé par la passerelle', status: envoi.status }, 502)
  }

  return reponse({ status: 'envoye' })
})
