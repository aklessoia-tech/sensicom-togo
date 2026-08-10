import { describe, expect, it } from 'vitest'
import { prochainCodeAgent } from './codeAgent'

describe('prochainCodeAgent', () => {
  it('démarre à A01 sur une base vierge', () => {
    expect(prochainCodeAgent([])).toBe('A01')
    expect(prochainCodeAgent([null, undefined, ''])).toBe('A01')
  })

  it('suit la numérotation en cours', () => {
    expect(prochainCodeAgent(['A01', 'A02'])).toBe('A03')
    expect(prochainCodeAgent(['A01', 'A02', 'A03', 'A04'])).toBe('A05')
  })

  // Un compte supprimé doit rendre son numéro, sinon la suite file vers A99
  // alors que la moitié des codes sont libres.
  it('comble les trous avant de poursuivre', () => {
    expect(prochainCodeAgent(['A01', 'A03'])).toBe('A02')
    expect(prochainCodeAgent(['A02', 'A03'])).toBe('A01')
  })

  it('ignore l’ordre de la liste', () => {
    expect(prochainCodeAgent(['A03', 'A01', 'A02'])).toBe('A04')
  })

  it('conserve le préfixe employé', () => {
    expect(prochainCodeAgent(['B01', 'B02'])).toBe('B03')
    expect(prochainCodeAgent(['AG01'])).toBe('AG02')
  })

  // Quelques codes saisis à la main ne doivent pas détourner la numérotation.
  it('retient le préfixe le plus répandu', () => {
    expect(prochainCodeAgent(['A01', 'A02', 'A03', 'Z09'])).toBe('A04')
  })

  it('conserve la largeur du numéro', () => {
    expect(prochainCodeAgent(['A001', 'A002'])).toBe('A003')
  })

  it('passe à trois chiffres seulement si la base le fait déjà', () => {
    expect(prochainCodeAgent(['A99'])).toBe('A01')
    expect(prochainCodeAgent(Array.from({ length: 99 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`))).toBe('A100')
  })

  it('normalise la casse et les espaces', () => {
    expect(prochainCodeAgent([' a01 ', 'a02'])).toBe('A03')
  })

  it('écarte les codes hors format', () => {
    expect(prochainCodeAgent(['XX', 'A01'])).toBe('A02')
  })
})
