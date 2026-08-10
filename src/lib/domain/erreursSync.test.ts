import { describe, expect, it } from 'vitest'
import { erreurDefinitive, messageErreurSync } from './erreursSync'

describe('erreurDefinitive', () => {
  it('reconnaît les rejets que le serveur répétera', () => {
    expect(erreurDefinitive('23505')).toBe(true) // unicité
    expect(erreurDefinitive('23503')).toBe(true) // clé étrangère
    expect(erreurDefinitive('23514')).toBe(true) // contrainte de validation
    expect(erreurDefinitive('42501')).toBe(true) // RLS
  })

  // Une coupure réseau doit rester réessayable, sinon la donnée est perdue alors
  // qu'elle serait passée à la tentative suivante.
  it('laisse réessayables les pannes passagères', () => {
    expect(erreurDefinitive('08006')).toBe(false) // connexion interrompue
    expect(erreurDefinitive('57014')).toBe(false) // requête annulée
    expect(erreurDefinitive(undefined)).toBe(false)
    expect(erreurDefinitive(null)).toBe(false)
    expect(erreurDefinitive('')).toBe(false)
  })
})

describe('messageErreurSync', () => {
  it('dit à l’agent quoi faire quand le numéro de coupon est pris', () => {
    expect(messageErreurSync('23505', 'coupons', 'duplicate key value')).toBe(
      'Ce numéro de coupon est déjà utilisé. Remettez un coupon de secours à la personne.',
    )
  })

  // Le même code sur une autre table annonçait à tort un problème de coupon.
  it('ne parle pas de coupon pour un conflit de session', () => {
    const message = messageErreurSync('23505', 'sessions', 'duplicate key value')
    expect(message).not.toContain('coupon')
    expect(message).toBe('Une séance identique existe déjà côté serveur.')
  })

  it('retombe sur le message du serveur pour une table sans libellé dédié', () => {
    expect(messageErreurSync('23505', 'personnes_sensibilisees', 'duplicate key value')).toBe(
      'duplicate key value',
    )
  })

  it('explique un refus de RLS en termes de zone', () => {
    expect(messageErreurSync('42501', 'coupons', 'permission denied')).toContain('zone')
  })

  it('laisse intact le message d’une erreur passagère', () => {
    expect(messageErreurSync('08006', 'coupons', 'connection terminated')).toBe(
      'connection terminated',
    )
  })
})
