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

/** Format : REGION-CAMPUS-ZONE-AAAAMMJJ-NNN */
export function formaterNumeroCoupon(
  universite: Universite,
  zone: Zone,
  date: string,
  sequence: number,
): string {
  const jour = date.replaceAll('-', '')
  const seq = String(sequence).padStart(3, '0')
  return [abregerRegion(universite.region), abregerCampus(zone.campus), zone.code, jour, seq].join('-')
}

export function numeroCouponValide(numero: string): boolean {
  return /^[A-Z0-9]{2,4}-[A-Z0-9]{1,3}-[A-Z0-9-]+-\d{8}-\d{3}$/.test(numero.trim().toUpperCase())
}

/**
 * Coupon numérique de secours : utilisé quand le carnet papier est épuisé ou illisible.
 * Le suffixe aléatoire évite toute collision entre agents hors ligne sur la même zone.
 */
export function genererCouponSecours(universite: Universite, zone: Zone, date: string): string {
  const jour = date.replaceAll('-', '')
  const aleatoire = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(36).toUpperCase().padStart(2, '0'))
    .join('')
    .slice(0, 5)
  return [abregerRegion(universite.region), abregerCampus(zone.campus), zone.code, jour, `S${aleatoire}`].join('-')
}

export function estCouponSecours(numero: string): boolean {
  return /-S[A-Z0-9]{4,5}$/.test(numero.trim().toUpperCase())
}
