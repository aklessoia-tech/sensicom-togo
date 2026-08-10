import { describe, expect, it } from 'vitest'
import {
  estCouponSecours,
  formaterNumeroCoupon,
  genererCouponSecours,
  numeroCouponAcceptable,
  numeroCouponCanonique,
} from './coupons'
import type { Universite, Zone } from './types'

const LOME: Universite = { id: 'u1', nom: 'Université de Lomé', region: 'Maritime', code: 'UL' }
const KARA: Universite = { id: 'u2', nom: 'Université de Kara', region: 'Kara', code: 'UK' }

const CITE: Zone = {
  id: 'z1',
  universite_id: 'u1',
  campus: 'Campus Nord',
  secteur: 'Cité universitaire',
  code: 'UL-N-CITE',
}

describe('formaterNumeroCoupon', () => {
  it('assemble région, campus, zone, date, agent et séquence', () => {
    expect(formaterNumeroCoupon(LOME, CITE, '2026-08-06', 'A01', 1)).toBe(
      'MAR-CN-UL-N-CITE-20260806-A01-001',
    )
  })

  it('complète la séquence sur trois chiffres', () => {
    expect(formaterNumeroCoupon(LOME, CITE, '2026-08-06', 'A01', 42)).toContain('-042')
    expect(formaterNumeroCoupon(LOME, CITE, '2026-08-06', 'A01', 7)).toContain('-007')
  })

  it('abrège une région inconnue sur trois lettres', () => {
    const inconnue: Universite = { ...KARA, region: 'Golfe' }
    expect(formaterNumeroCoupon(inconnue, CITE, '2026-08-06', 'A01', 1)).toMatch(/^GOL-/)
  })

  // Le cœur du correctif : sans code d'agent, deux agents hors ligne dans la même
  // zone émettaient le même numéro et la synchronisation en perdait un.
  it('distingue deux agents émettant le même jour dans la même zone', () => {
    const a = formaterNumeroCoupon(LOME, CITE, '2026-08-06', 'A01', 1)
    const b = formaterNumeroCoupon(LOME, CITE, '2026-08-06', 'A02', 1)
    expect(a).not.toBe(b)
  })

  it('retombe sur XX quand le compte n’a pas encore de code', () => {
    expect(formaterNumeroCoupon(LOME, CITE, '2026-08-06', null, 1)).toContain('-XX-')
    expect(formaterNumeroCoupon(LOME, CITE, '2026-08-06', '  ', 1)).toContain('-XX-')
    expect(formaterNumeroCoupon(LOME, CITE, '2026-08-06', 'trop-long', 1)).toContain('-XX-')
  })

  it('normalise le code en majuscules', () => {
    expect(formaterNumeroCoupon(LOME, CITE, '2026-08-06', 'a01', 1)).toContain('-A01-')
  })
})

describe('numeroCouponCanonique', () => {
  it('accepte un numéro au format courant', () => {
    expect(numeroCouponCanonique('MAR-CN-UL-N-CITE-20260806-A01-001')).toBe(true)
  })

  it('accepte un numéro saisi en minuscules ou entouré d’espaces', () => {
    expect(numeroCouponCanonique('  mar-cn-ul-n-cite-20260806-a01-001  ')).toBe(true)
  })

  it('refuse un numéro sans code d’agent', () => {
    expect(numeroCouponCanonique('MAR-CN-UL-N-CITE-20260806-001')).toBe(false)
  })

  it('refuse une séquence hors format', () => {
    expect(numeroCouponCanonique('MAR-CN-UL-N-CITE-20260806-A01-1')).toBe(false)
  })
})

describe('numeroCouponAcceptable', () => {
  it('accepte le numéro que l’application génère', () => {
    expect(numeroCouponAcceptable('MAR-CN-UL-N-CITE-20260806-A01-001')).toBe(true)
  })

  // Les carnets papier portent leur propre numérotation, imprimée avant que
  // l'application n'existe : la refuser obligerait l'agent à en inventer une.
  it('accepte la numérotation d’un carnet papier', () => {
    expect(numeroCouponAcceptable('000123')).toBe(true)
    expect(numeroCouponAcceptable('UL/2026/0042')).toBe(true)
    expect(numeroCouponAcceptable('LOT B - 017')).toBe(true)
    expect(numeroCouponAcceptable('A.12.4')).toBe(true)
  })

  it('refuse une saisie inexploitable', () => {
    expect(numeroCouponAcceptable('')).toBe(false)
    expect(numeroCouponAcceptable('  ')).toBe(false)
    expect(numeroCouponAcceptable('AB')).toBe(false)
    expect(numeroCouponAcceptable('-123')).toBe(false)
    expect(numeroCouponAcceptable('X'.repeat(65))).toBe(false)
  })

  it('refuse les caractères qui ne se relisent pas sur un coupon', () => {
    expect(numeroCouponAcceptable('12<script>')).toBe(false)
    expect(numeroCouponAcceptable('N°123')).toBe(false)
  })
})

describe('genererCouponSecours', () => {
  it('porte le code d’agent et le marqueur de secours', () => {
    const numero = genererCouponSecours(LOME, CITE, '2026-08-06', 'A01')
    expect(numero).toContain('-A01-S')
    expect(estCouponSecours(numero)).toBe(true)
  })

  it('produit un numéro différent à chaque appel', () => {
    const tirages = new Set(
      Array.from({ length: 50 }, () => genererCouponSecours(LOME, CITE, '2026-08-06', 'A01')),
    )
    expect(tirages.size).toBeGreaterThan(45)
  })

  it('n’est pas confondu avec un coupon séquentiel', () => {
    expect(estCouponSecours('MAR-CN-UL-N-CITE-20260806-A01-001')).toBe(false)
  })
})
