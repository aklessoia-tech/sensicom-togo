/**
 * Le numéro de téléphone ne quitte jamais l'appareil en clair : seuls une empreinte
 * SHA-256 et les 4 derniers chiffres sont conservés, ce qui suffit à l'anti-doublon
 * sans jamais permettre de remonter à une identité.
 */

const PEPPER = 'sensicom-togo-v1'

export function normaliserTelephone(brut: string): string {
  const chiffres = brut.replace(/\D/g, '')
  // Les numéros togolais sont saisis indifféremment avec ou sans indicatif 228.
  return chiffres.startsWith('228') && chiffres.length > 8 ? chiffres.slice(3) : chiffres
}

export function telephoneValide(brut: string): boolean {
  return normaliserTelephone(brut).length === 8
}

export function suffixeTelephone(brut: string): string {
  return normaliserTelephone(brut).slice(-4)
}

export async function hasherTelephone(brut: string): Promise<string> {
  const normalise = normaliserTelephone(brut)
  const donnees = new TextEncoder().encode(`${PEPPER}:${normalise}`)
  const empreinte = await crypto.subtle.digest('SHA-256', donnees)
  return Array.from(new Uint8Array(empreinte))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
