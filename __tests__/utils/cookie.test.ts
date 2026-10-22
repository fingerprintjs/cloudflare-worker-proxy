import { describe, it, expect } from 'vitest'
import { filterCookies } from '../../src/utils'

describe('filterCookies', () => {
  it('works when there is no cookie', () => {
    const headers = new Headers()
    headers.set('x', 'y')
    const resultHeaders = filterCookies(headers, (key) => key === 'a')
    expect(resultHeaders.get('cookie')).toBe(null)
    expect(resultHeaders.get('x')).toBe('y')
  })
  it('removes other keys', () => {
    const headers = new Headers()
    headers.set('cookie', 'a=1; b=2')
    const resultHeaders = filterCookies(headers, (key) => key === 'a')
    expect(resultHeaders.get('cookie')).toBe('a=1')
  })
  it('removes other keys when no match', () => {
    const headers = new Headers()
    headers.set('cookie', 'a=1; b=2')
    headers.set('authentication', 'basic YWRtaW46MTIzNDU2')
    headers.set('x-custom-header', 'foo_bar')
    const resultHeaders = filterCookies(headers, (key) => key === 'c')
    expect(resultHeaders.get('cookie')).toBe(null)
    expect(resultHeaders.get('authentication')).toBe('basic YWRtaW46MTIzNDU2')
    expect(resultHeaders.get('x-custom-header')).toBe('foo_bar')
  })
  it('works for _iidt', () => {
    const headers = new Headers()
    const _iidtCookieValue =
      'jF5EK63pIrQofJ2za7GCbkn+Wy35Qmf2TLAih50+S2fNq86nv9wPH/aOuY7Xkcv1GUIKB1ky2aYT1ilQKoHHZW2tWA=='
    headers.set('cookie', `x=y; _iidt=${_iidtCookieValue}; b=2`)
    const resultHeaders = filterCookies(headers, (key) => key === '_iidt')
    expect(resultHeaders.get('cookie')).toBe(`_iidt=${_iidtCookieValue}`)
  })

  it('preserves percent-encoded _iidt value', () => {
    const headers = new Headers()
    const _iidtCookieValue = '%41%42%43'
    headers.set('cookie', `x=y; _iidt=${_iidtCookieValue}; b=2`)
    const resultHeaders = filterCookies(headers, (key) => key === '_iidt')
    expect(resultHeaders.get('cookie')).toBe(`_iidt=${_iidtCookieValue}`)
  })

  describe('parsing', () => {
    function filterSingle(cookie: string, name: string): string | null {
      const headers = new Headers()
      headers.set('cookie', cookie)
      return filterCookies(headers, (key) => key === name).get('cookie')
    }

    it('keeps single cookie', () => {
      expect(filterSingle('sessionId=abc123', 'sessionId')).toBe('sessionId=abc123')
    })

    it('keeps cookie in middle of multiple cookies', () => {
      expect(filterSingle('sessionId=abc123; _iidt=xyz789; theme=dark', '_iidt')).toBe('_iidt=xyz789')
    })

    it('keeps first cookie in multiple cookies', () => {
      expect(filterSingle('sessionId=abc123; _iidt=xyz789; theme=dark', 'sessionId')).toBe('sessionId=abc123')
    })

    it('keeps last cookie in multiple cookies', () => {
      expect(filterSingle('sessionId=abc123; _iidt=xyz789; theme=dark', 'theme')).toBe('theme=dark')
    })

    it('removes cookie header for non-existent cookie', () => {
      expect(filterSingle('sessionId=abc123; theme=dark', 'nonexistent')).toBe(null)
    })

    it('does not match partial cookie names', () => {
      expect(filterSingle('sessionId=abc123; theme=dark', 'session')).toBe(null)
    })

    it('is case sensitive', () => {
      expect(filterSingle('sessionId=abc123; theme=dark', 'sessionid')).toBe(null)
    })

    it('handles empty cookie string', () => {
      expect(filterSingle('', 'test')).toBe(null)
    })

    it('handles empty cookie name', () => {
      expect(filterSingle('test=value', '')).toBe(null)
    })

    it('handles whitespace-only cookie string', () => {
      expect(filterSingle(' ', 'test')).toBe(null)
    })

    it('does not modify URL-encoded values', () => {
      expect(filterSingle('token=Bearer%20abc123', 'token')).toBe('token=Bearer%20abc123')
    })

    it('handles special characters in values', () => {
      expect(filterSingle('path=/api/v1; secure=true', 'path')).toBe('path=/api/v1')
    })

    it('handles JSON-like values', () => {
      expect(filterSingle('json={"key":"value"}; other=test', 'json')).toBe('json={"key":"value"}')
    })

    it('handles cookie names with dashes', () => {
      expect(filterSingle('name-with-dashes=value', 'name-with-dashes')).toBe('name-with-dashes=value')
    })

    it('handles cookie names with underscores', () => {
      expect(filterSingle('name_with_underscores=value', 'name_with_underscores')).toBe('name_with_underscores=value')
    })

    it('handles empty cookie values', () => {
      expect(filterSingle('empty=; test=value', 'empty')).toBe('empty=')
    })

    it('does not include surrounding whitespace in cookie name or value', () => {
      expect(filterSingle('test=value ; other=value2', 'test')).toBe('test=value')
      expect(filterSingle('a=1;\t _iidt = xyz \t;b=2', '_iidt')).toBe('_iidt=xyz')
    })

    it('matches exact cookie name, not similar ones', () => {
      expect(filterSingle('user=john; username=jane; userinfo=data', 'user')).toBe('user=john')
      expect(filterSingle('test=value; testmore=othervalue', 'test')).toBe('test=value')
    })

    it('handles values containing multiple = signs', () => {
      const cookieStr = 'auth=base64_iidt==; _iidt=asdfaasf;'
      expect(filterSingle(cookieStr, '_iidt')).toBe('_iidt=asdfaasf')
      expect(filterSingle(cookieStr, 'auth')).toBe('auth=base64_iidt==')
    })

    it('keeps the first value when cookie name is duplicated', () => {
      expect(filterSingle('_iidt=first; _iidt=second', '_iidt')).toBe('_iidt=first')
    })

    it('skips pairs without = sign', () => {
      expect(filterSingle('invalid; _iidt=xyz; alsoinvalid', '_iidt')).toBe('_iidt=xyz')
    })

    it('keeps multiple matching cookies', () => {
      const headers = new Headers()
      headers.set('cookie', 'a=1; b=2; c=3')
      const resultHeaders = filterCookies(headers, (key) => key !== 'b')
      expect(resultHeaders.get('cookie')).toBe('a=1; c=3')
    })
  })
})
