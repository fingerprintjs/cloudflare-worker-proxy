/*!
 * Cookie parsing based on jshttp/cookie (https://github.com/jshttp/cookie)
 *
 * @license MIT
 * Copyright (c) 2012-2014 Roman Shtylman <shtylman@gmail.com>
 * Copyright (c) 2015 Douglas Christopher Wilson <doug@somethingdoug.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Cookies object.
 */
type Cookies = Map<string, string | undefined>

/**
 * Parse a `Cookie` header.
 *
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 */
function parseCookies(str: string): Cookies {
  const obj: Cookies = new Map()
  const len = str.length
  // RFC 6265 sec 4.1.1, RFC 2616 2.2 defines a cookie name consists of one char minimum, plus '='.
  if (len < 2) {
    return obj
  }

  let index = 0

  do {
    const eqIdx = str.indexOf('=', index)
    if (eqIdx === -1) {
      break
    } // No more cookie pairs.

    const endIdx = endIndex(str, index, len)

    if (eqIdx > endIdx) {
      // backtrack on prior semicolon
      index = str.lastIndexOf(';', eqIdx - 1) + 1
      continue
    }

    const key = valueSlice(str, index, eqIdx)

    // only assign once
    if (obj.get(key) === undefined) {
      obj.set(key, valueSlice(str, eqIdx + 1, endIdx))
    }

    index = endIdx + 1
  } while (index < len)

  return obj
}

/**
 * Find the `;` character between `min` and `len` in str.
 */
function endIndex(str: string, min: number, len: number) {
  const index = str.indexOf(';', min)
  return index === -1 ? len : index
}

/**
 * Slice out a value between startPod to max.
 */
function valueSlice(str: string, min: number, max: number) {
  let start = min
  let end = max

  do {
    const code = str.charCodeAt(start)
    if (code !== 0x20 /*   */ && code !== 0x09 /* \t */) {
      break
    }
  } while (++start < end)

  while (end > start) {
    const code = str.charCodeAt(end - 1)
    if (code !== 0x20 /*   */ && code !== 0x09 /* \t */) {
      break
    }
    end--
  }

  return str.slice(start, end)
}

export function filterCookies(headers: Headers, filterFunc: (key: string) => boolean): Headers {
  const newHeaders = new Headers(headers)
  const cookies = parseCookies(headers.get('cookie') ?? '')
  const filteredCookieList = []
  for (const [cookieName, cookieValue] of cookies) {
    if (filterFunc(cookieName)) {
      filteredCookieList.push(`${cookieName}=${cookieValue}`)
    }
  }
  newHeaders.delete('cookie')
  if (filteredCookieList.length > 0) {
    newHeaders.set('cookie', filteredCookieList.join('; '))
  }

  return newHeaders
}
