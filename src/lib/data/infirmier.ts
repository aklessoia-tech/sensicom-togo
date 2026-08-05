import { db, enqueue } from '../offline/db'
import { flushOutbox, refreshPendingCount } from '../offline/syncEngine'
import { supabase, isSupabaseConfigured } from '../supabase/client'
import type { ActeMedical, Coupon, Local, TypeActe } from '../domain/types'

export interface CouponTrouve {
  coupon: Coupon
  zone_libelle: string
  thematique_libelle: string
  source: 'local' | 'serveur'
}

/**
 * Recherche locale d'abord — l'infirmerie travaille souvent sans réseau — puis
 * repli sur le serveur. Le résultat n'expose jamais d'identité, seulement la zone
 * et la thématique rattachées au coupon.
 */
export async function rechercherCoupon(numero: string): Promise<CouponTrouve | null> {
  const cible = numero.trim().toUpperCase()
  const referentiels = await db.referentiels.get('referentiels')

  const libelles = (zoneId: string, thematiqueId: string) => {
    const zone = referentiels?.zones.find((z) => z.id === zoneId)
    const thematique = referentiels?.thematiques.find((t) => t.id === thematiqueId)
    return {
      zone_libelle: zone ? `${zone.campus} — ${zone.secteur}` : 'Zone inconnue',
      thematique_libelle: thematique?.libelle ?? 'Thématique inconnue',
    }
  }

  const local = await db.coupons.where('numero').equals(cible).first()
  if (local) {
    return { coupon: local, ...libelles(local.zone_id, local.thematique_id), source: 'local' }
  }

  if (!isSupabaseConfigured || !navigator.onLine) return null

  const { data, error } = await supabase.from('coupons').select('*').eq('numero', cible).maybeSingle()
  if (error || !data) return null

  const coupon = data as Coupon
  await db.coupons.put({ ...coupon, syncState: 'synced', updatedLocalAt: Date.now() })
  return { coupon, ...libelles(coupon.zone_id, coupon.thematique_id), source: 'serveur' }
}

export interface NouvelActe {
  infirmier_id: string
  zone_id: string
  type_acte: TypeActe
  date_acte: string
  coupon_id: string | null
  numero_coupon_saisi: string | null
  coupon_illisible: boolean
  zone_approximative: string | null
  notes: string | null
}

export async function enregistrerActe(saisie: NouvelActe): Promise<Local<ActeMedical>> {
  // En attente tant qu'un numéro a été saisi sans coupon correspondant :
  // le rapprochement se fera automatiquement à l'arrivée de la session de l'agent.
  const enAttente = saisie.coupon_id === null && saisie.numero_coupon_saisi !== null

  const acte: Local<ActeMedical> = {
    id: crypto.randomUUID(),
    ...saisie,
    numero_coupon_saisi: saisie.numero_coupon_saisi?.trim().toUpperCase() ?? null,
    en_attente_rapprochement: enAttente,
    syncState: 'pending',
    updatedLocalAt: Date.now(),
  }

  await db.actes.put(acte)
  await enqueue('actes_medicaux', acte.id, {
    id: acte.id,
    infirmier_id: acte.infirmier_id,
    coupon_id: acte.coupon_id,
    numero_coupon_saisi: acte.numero_coupon_saisi,
    zone_id: acte.zone_id,
    type_acte: acte.type_acte,
    date_acte: acte.date_acte,
    coupon_illisible: acte.coupon_illisible,
    zone_approximative: acte.zone_approximative,
    en_attente_rapprochement: acte.en_attente_rapprochement,
    notes: acte.notes,
  })

  if (acte.coupon_id) {
    await db.coupons.update(acte.coupon_id, { statut: 'utilise' })
  }

  await refreshPendingCount()
  void flushOutbox()
  return acte
}

/** Rattache localement les actes en attente dont le coupon vient d'être reçu. */
export async function rapprocherActesLocaux(): Promise<number> {
  const enAttente = await db.actes.filter((a) => a.en_attente_rapprochement).toArray()
  let rapproches = 0

  for (const acte of enAttente) {
    if (!acte.numero_coupon_saisi) continue
    const coupon = await db.coupons.where('numero').equals(acte.numero_coupon_saisi).first()
    if (!coupon) continue

    await db.actes.update(acte.id, { coupon_id: coupon.id, en_attente_rapprochement: false })
    await db.coupons.update(coupon.id, { statut: 'utilise' })
    rapproches += 1
  }

  return rapproches
}

export async function actesRecents(infirmierId: string, limite = 30): Promise<Local<ActeMedical>[]> {
  const tous = await db.actes.toArray()
  return tous
    .filter((a) => a.infirmier_id === infirmierId)
    .sort((a, b) => b.updatedLocalAt - a.updatedLocalAt)
    .slice(0, limite)
}
