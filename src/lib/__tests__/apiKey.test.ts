import { describe, expect, it } from 'vitest'
import { apiKeyShapeError, normalizeApiKey } from '../apiKey'
import { keyCheckMessage } from '../coachApi'

// Assembled at runtime rather than written out: a literal shaped like a real
// Gemini key trips GitHub's secret scanner and blocks the push, even invented.
const key = (prefix: string) => prefix + 'x'.repeat(40)
const REAL = key('AQ.')
const LEGACY = key('AIzaSy')

describe('normalizeApiKey', () => {
  it('strips the whitespace a phone paste drags along', () => {
    expect(normalizeApiKey(`  ${REAL}\n`)).toBe(REAL)
    expect(normalizeApiKey(`${REAL} `)).toBe(REAL)
  })

  it('strips quotes and a key= label from a copied code sample', () => {
    expect(normalizeApiKey(`"${REAL}"`)).toBe(REAL)
    expect(normalizeApiKey(`API_KEY=${REAL}`)).toBe(REAL)
    expect(normalizeApiKey(`key: ${REAL}`)).toBe(REAL)
  })

  it('is safe on empty input', () => {
    expect(normalizeApiKey('')).toBe('')
  })
})

describe('apiKeyShapeError', () => {
  it('accepts a real-looking key', () => {
    expect(apiKeyShapeError(REAL)).toBeNull()
    expect(apiKeyShapeError(LEGACY)).toBeNull()
  })

  it('accepts a key that only needed trimming', () => {
    expect(apiKeyShapeError(` ${REAL}\n`)).toBeNull()
  })

  it('names each mistake instead of always saying "too short"', () => {
    expect(apiKeyShapeError('')).toContain('לא הודבק')
    expect(apiKeyShapeError('https://aistudio.google.com/apikey')).toContain('כתובת')
    expect(
      apiKeyShapeError(`Your API key is ${REAL}`),
    ).toContain('טקסט מסביב')
    expect(apiKeyShapeError('AQ.Ab8RN6')).toContain('קצר')
  })
})

describe('keyCheckMessage', () => {
  it('tells a rejected key apart from a rate limit', () => {
    expect(keyCheckMessage(400)).toContain('לא מזהה')
    expect(keyCheckMessage(403)).toContain('לא מזהה')
    expect(keyCheckMessage(429)).toContain('תקין')
  })

  it('calls out a revoked key when Google says so', () => {
    expect(keyCheckMessage(400, 'API key expired. Please renew the API key.')).toContain(
      'פג',
    )
  })

  it('still explains an unexpected status', () => {
    expect(keyCheckMessage(500)).toContain('500')
  })
})
