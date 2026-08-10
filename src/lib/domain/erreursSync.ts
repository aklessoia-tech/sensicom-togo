export type TableSync = 'sessions' | 'personnes_sensibilisees' | 'coupons' | 'actes_medicaux'

/**
 * Erreurs que le serveur rejettera identiquement à chaque tentative : numéro déjà
 * pris, référence manquante, accès refusé. Les réessayer ne fait que retarder
 * l'alerte de l'agent, qui doit réagir tant que la personne est devant lui.
 */
const CODES_DEFINITIFS = new Set(['23505', '23503', '23514', '42501'])

// Une violation d'unicité ne veut pas dire la même chose selon la table : le
// message doit dire quoi faire, pas nommer une contrainte Postgres.
const MESSAGES_UNICITE: Partial<Record<TableSync, string>> = {
  coupons: 'Ce numéro de coupon est déjà utilisé. Remettez un coupon de secours à la personne.',
  sessions: 'Une séance identique existe déjà côté serveur.',
}

const MESSAGES_PAR_CODE: Record<string, string> = {
  '23503': 'Référence introuvable côté serveur (zone, session ou thématique supprimée).',
  '23514': 'Donnée refusée par le serveur : valeur hors des valeurs autorisées.',
  '42501': 'Accès refusé : cette zone ne correspond pas à celle de votre compte.',
}

export function erreurDefinitive(code: string | undefined | null): boolean {
  return CODES_DEFINITIFS.has(code ?? '')
}

/** Message lisible par l'agent ; à défaut, celui du serveur. */
export function messageErreurSync(
  code: string | undefined | null,
  table: TableSync,
  messageServeur: string,
): string {
  if (!erreurDefinitive(code)) return messageServeur
  if (code === '23505') return MESSAGES_UNICITE[table] ?? messageServeur
  return MESSAGES_PAR_CODE[code as string] ?? messageServeur
}
