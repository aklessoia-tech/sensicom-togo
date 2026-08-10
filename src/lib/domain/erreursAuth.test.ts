import { describe, expect, it } from 'vitest'
import { traduireErreurAuth } from './erreursAuth'

describe('traduireErreurAuth', () => {
  it('traduit le refus le plus courant', () => {
    const message = traduireErreurAuth('Invalid login credentials')
    expect(message).toContain('Adresse ou mot de passe incorrect')
  })

  // Le même message couvre l'adresse inconnue et le mauvais mot de passe :
  // sans cette précision, on cherche la faute du mauvais côté.
  it('rappelle que l’adresse identifie le compte', () => {
    expect(traduireErreurAuth('Invalid login credentials')).toContain('adresse')
  })

  it('traduit les autres refus connus', () => {
    expect(traduireErreurAuth('Email not confirmed')).toContain('confirmée')
    expect(traduireErreurAuth('User not found')).toContain('Aucun compte')
    expect(traduireErreurAuth('Password should be at least 8 characters')).toContain('trop court')
    expect(traduireErreurAuth('Request rate limit reached')).toContain('Trop de tentatives')
    expect(traduireErreurAuth('Failed to fetch')).toContain('injoignable')
  })

  it('est insensible à la casse', () => {
    expect(traduireErreurAuth('INVALID LOGIN CREDENTIALS')).toContain('Adresse ou mot de passe')
  })

  // Un message inconnu vaut mieux qu'un message inventé : on le laisse passer.
  it('laisse intact ce qu’il ne connaît pas', () => {
    expect(traduireErreurAuth('Something unexpected happened')).toBe('Something unexpected happened')
  })
})
