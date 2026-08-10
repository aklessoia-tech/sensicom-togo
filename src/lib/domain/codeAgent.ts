const FORMAT = /^([A-Z]+)(\d+)$/

/**
 * Prochain code libre, proposé à la création d'un compte. Le code entre dans le
 * numéro de coupon : le laisser vide expose l'agent aux collisions avec ses
 * collègues, et le faire choisir à la main invite aux doublons.
 *
 * La suite reprend le préfixe déjà en usage et comble d'abord les trous, pour
 * qu'un compte supprimé libère réellement son numéro.
 */
export function prochainCodeAgent(codesExistants: (string | null | undefined)[]): string {
  const connus = codesExistants
    .map((c) => c?.trim().toUpperCase())
    .filter((c): c is string => Boolean(c))

  const analyses = connus
    .map((c) => FORMAT.exec(c))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ prefixe: m[1], numero: Number(m[2]), largeur: m[2].length }))

  if (analyses.length === 0) return 'A01'

  // Le préfixe le plus répandu fait référence : une poignée de codes saisis à la
  // main ne doit pas détourner la numérotation de tout le reste.
  const frequences = new Map<string, number>()
  for (const a of analyses) frequences.set(a.prefixe, (frequences.get(a.prefixe) ?? 0) + 1)
  const prefixe = [...frequences.entries()].sort((a, b) => b[1] - a[1])[0][0]

  const memeFamille = analyses.filter((a) => a.prefixe === prefixe)
  const pris = new Set(memeFamille.map((a) => a.numero))
  const largeur = Math.max(2, ...memeFamille.map((a) => a.largeur))

  let candidat = 1
  while (pris.has(candidat)) candidat += 1

  return `${prefixe}${String(candidat).padStart(largeur, '0')}`
}
