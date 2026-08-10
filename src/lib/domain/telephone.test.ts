import { describe, expect, it } from 'vitest'
import { hasherTelephone, normaliserTelephone, suffixeTelephone, telephoneValide } from './telephone'

describe('normaliserTelephone', () => {
  it('retire espaces et ponctuation', () => {
    expect(normaliserTelephone('90 12 34 56')).toBe('90123456')
    expect(normaliserTelephone('90-12-34-56')).toBe('90123456')
  })

  it('retire l’indicatif togolais, saisi ou non', () => {
    expect(normaliserTelephone('+228 90 12 34 56')).toBe('90123456')
    expect(normaliserTelephone('22890123456')).toBe('90123456')
    expect(normaliserTelephone('90123456')).toBe('90123456')
  })

  // 228… sur 8 chiffres est un numéro local, pas un indicatif suivi du numéro.
  it('ne confond pas un numéro commençant par 228 avec un indicatif', () => {
    expect(normaliserTelephone('22812345')).toBe('22812345')
  })
})

describe('telephoneValide', () => {
  it('exige huit chiffres après normalisation', () => {
    expect(telephoneValide('90123456')).toBe(true)
    expect(telephoneValide('+228 90 12 34 56')).toBe(true)
    expect(telephoneValide('901234')).toBe(false)
    expect(telephoneValide('901234567')).toBe(false)
    expect(telephoneValide('')).toBe(false)
  })
})

describe('suffixeTelephone', () => {
  it('conserve les quatre derniers chiffres', () => {
    expect(suffixeTelephone('90123456')).toBe('3456')
    expect(suffixeTelephone('+228 90 12 34 56')).toBe('3456')
  })
})

describe('hasherTelephone', () => {
  it('produit une empreinte SHA-256 en hexadécimal', async () => {
    const hash = await hasherTelephone('90123456')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('donne la même empreinte quelle que soit la mise en forme saisie', async () => {
    const [a, b, c] = await Promise.all([
      hasherTelephone('90123456'),
      hasherTelephone('90 12 34 56'),
      hasherTelephone('+228 90 12 34 56'),
    ])
    expect(a).toBe(b)
    expect(a).toBe(c)
  })

  it('distingue deux numéros différents', async () => {
    const [a, b] = await Promise.all([hasherTelephone('90123456'), hasherTelephone('90123457')])
    expect(a).not.toBe(b)
  })

  // L'anonymat repose là-dessus : le numéro ne doit jamais réapparaître en clair.
  it('ne laisse pas transparaître le numéro dans l’empreinte', async () => {
    const hash = await hasherTelephone('90123456')
    expect(hash).not.toContain('90123456')
  })
})
