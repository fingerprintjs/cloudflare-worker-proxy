function findDirectiveIndex(directives: string[], directive: 'max-age' | 's-maxage') {
  return directives.findIndex((directivePair) => directivePair.split('=')[0].trim().toLowerCase() === directive)
}

function clampDirectiveAt(
  directives: string[],
  directiveIndex: number,
  directive: 'max-age' | 's-maxage',
  cap: number
) {
  const oldValue = Number(directives[directiveIndex].split('=')[1])
  directives[directiveIndex] = `${directive}=${Math.min(cap, oldValue)}`
}

export function getCacheControlHeaderWithMaxAgeIfLower(
  cacheControlHeaderValue: string,
  maxMaxAge: number,
  maxSMaxAge: number
): string {
  const cacheControlDirectives = cacheControlHeaderValue.split(', ')

  const maxAgeIndex = findDirectiveIndex(cacheControlDirectives, 'max-age')
  if (maxAgeIndex === -1) {
    cacheControlDirectives.push(`max-age=${maxMaxAge}`)
  } else {
    clampDirectiveAt(cacheControlDirectives, maxAgeIndex, 'max-age', maxMaxAge)
  }

  const sMaxAgeIndex = findDirectiveIndex(cacheControlDirectives, 's-maxage')
  if (sMaxAgeIndex !== -1) {
    clampDirectiveAt(cacheControlDirectives, sMaxAgeIndex, 's-maxage', maxSMaxAge)
  }

  return cacheControlDirectives.join(', ')
}
