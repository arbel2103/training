import { describe, expect, it } from 'vitest'
import { oauthErrorMessage } from '../googleCalendar'

describe('oauthErrorMessage', () => {
  it('turns access_denied into something a first-time user can act on', () => {
    const msg = oauthErrorMessage('access_denied')
    // covers both readings of the code: cancelled, or blocked by the
    // unverified-app screen whose way forward hides behind "Advanced"
    expect(msg).toContain('נסה שוב')
    expect(msg).toContain('מתקדם')
    expect(msg).not.toContain('access_denied')
  })

  it('points an org-managed account at a personal one', () => {
    expect(oauthErrorMessage('admin_policy_enforced')).toContain('פרטי')
  })

  it('keeps an unknown code visible instead of swallowing it', () => {
    expect(oauthErrorMessage('some_new_code')).toContain('some_new_code')
  })

  it('never returns an empty message', () => {
    for (const code of [
      'access_denied',
      'admin_policy_enforced',
      'invalid_client',
      'unauthorized_client',
      'server_error',
      'temporarily_unavailable',
      '',
    ])
      expect(oauthErrorMessage(code).length).toBeGreaterThan(10)
  })
})
