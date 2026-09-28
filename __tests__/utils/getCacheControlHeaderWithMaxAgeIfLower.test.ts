import { describe, test, expect } from 'vitest'
import { getCacheControlHeaderWithMaxAgeIfLower } from '../../src/utils'

describe('getCacheControlHeaderWithMaxAgeIfLower', () => {
  const f = getCacheControlHeaderWithMaxAgeIfLower
  test('if maxAge < maxMaxAge then use maxAge', () => {
    expect(f('public, max-age=3600, s-maxage=633059', 1200, 100)).toBe('public, max-age=1200, s-maxage=100')
  })
  test('if maxAge > maxMaxAge then use maxMaxAge', () => {
    expect(f('public, max-age=3600, s-maxage=633059', 6000, 100)).toBe('public, max-age=3600, s-maxage=100')
  })
  test('if maxAge is absent then use maxMaxAge', () => {
    expect(f('public', 6000, 100)).toBe('public, max-age=6000')
  })
  test('if s-maxAge < maxSMaxAge then use maxSMaxAge', () => {
    expect(f('public, max-age=3600, s-maxage=3600', 1200, 1200)).toBe('public, max-age=1200, s-maxage=1200')
  })
  test('if s-maxAge > maxMaxAge then use s-MaxAge', () => {
    expect(f('public, max-age=3600, s-maxage=3600', 6000, 6000)).toBe('public, max-age=3600, s-maxage=3600')
  })
  test('if s-maxAge is absent then it stays absent', () => {
    expect(f('public', 6000, 6000)).toBe('public, max-age=6000')
  })
  test('s-maxage is not introduced when the origin only sends max-age', () => {
    expect(f('public, max-age=3570', 3600, 60)).toBe('public, max-age=3570')
  })
})
