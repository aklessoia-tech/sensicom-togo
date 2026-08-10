import type { Universite, Zone } from './types'

const REGIONS_ABREGEES: Record<string, string> = {
  Maritime: 'MAR',
  Plateaux: 'PLA',
  Centrale: 'CEN',
  Kara: 'KAR',
  Savanes: 'SAV',
}

function abregerRegion(region: string): string {
  return REGIONS_ABREGEES[region] ?? region.slice(0, 3).toUpperCase()
}

function abregerCampus(campus: string): string {
  return campus
    .split(/\s+/)
    .map((mot) => mot[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

/**
 * Le code d'agent est indispensable à l'unicité : le compteur étant calculé sur
 * l'appareil pour fonctionner hors ligne, deux agents de la même zone le même
 * jour produiraient sinon le même numéro. Un compte sans code retombe sur « XX »,
 * qui reste reconnaissable à l'œil comme un coupon à vérifier.
 */
function codeAgentOuDefaut(codeAgent: string | null | undefined): string {
  const code = codeAgent?.trim().toUpperCase()
  return code && /^[A-Z0-9]{2,4}$/.test(code) ? code : 'XX'
}

/** Format : REGION-CAMPUS-ZONE-AAAAMMJJ-AGENT-NNN */
export function formaterNumeroCoupon(
  universite: Universite,
  zone: Zone,
  date: string,
  codeAgent: string | null | undefined,
  sequence: number,
): string {
  const jour = date.replaceAll('-', '')
  const seq = String(sequence).padStart(3, '0')
  return [
    abregerRegion(universite.region),
    abregerCampus(zone.campus),
    zone.code,
    jour,
    codeAgentOuDefaut(codeAgent),
    seq,
  ].join('-')
}

/** Numéro tel que l'application le génère. */
export function numeroCouponCanonique(numero: string): boolean {
  return /^[A-Z0-9]{2,4}-[A-Z0-9]{1,3}-[A-Z0-9-]+-\d{8}-[A-Z0-9]{2,4}-\d{3}$/.test(
    numero.trim().toUpperCase(),
  )
}

/**
 * Ce que l'application accepte d'enregistrer. Volontairement large : les carnets
 * papier distribués sur le terrain portent leur propre numérotation, imprimée
 * avant que l'application n'existe. Refuser ce numéro obligerait l'agent à en
 * inventer un autre, et l'infirmerie ne retrouverait jamais le coupon présenté.
 * L'unicité, elle, reste garantie par la base.
 */
export function numeroCouponAcceptable(numero: string): boolean {
  const n = numero.trim().toUpperCase()
  return n.length >= 3 && n.length <= 64 && /^[A-Z0-9][A-Z0-9\-/. ]*$/.test(n)
}

/**
 * Coupon numérique de secours : utilisé quand le carnet papier est épuisé ou illisible.
 * Le suffixe aléatoire s'ajoute au code d'agent, ce qui écarte toute collision même
 * si deux agents en génèrent au même instant hors ligne.
 */
export function genererCouponSecours(
  universite: Universite,
  zone: Zone,
  date: string,
  codeAgent: string | null | undefined,
): string {
  const jour = date.replaceAll('-', '')
  const aleatoire = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(36).toUpperCase().padStart(2, '0'))
    .join('')
    .slice(0, 5)
  return [
    abregerRegion(universite.region),
    abregerCampus(zone.campus),
    zone.code,
    jour,
    codeAgentOuDefaut(codeAgent),
    `S${aleatoire}`,
  ].join('-')
}

export function estCouponSecours(numero: string): boolean {
  return /-S[A-Z0-9]{4,5}$/.test(numero.trim().toUpperCase())
}
