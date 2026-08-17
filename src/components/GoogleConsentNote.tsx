import Icon from './ui/Icon'

/**
 * What to expect from Google's consent screen, shown *before* the first
 * connection rather than after it fails.
 *
 * The app asks for sensitive scopes (calendar + drive) without Google
 * verification, so a first-time user meets an "app isn't verified" interstitial
 * whose only way forward is hidden behind "Advanced". Left unexplained, that
 * screen reads like a security warning and people back out — and then ask the
 * person who sent them the link. Saying it up front is what keeps the setup
 * self-service.
 */
export default function GoogleConsentNote() {
  return (
    <p className="text-xs text-muted flex items-start gap-1.5 leading-relaxed">
      <Icon name="help" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>
        בפעם הראשונה גוגל תבקש אישור. אם יופיע מסך <b>"האפליקציה לא מאומתת"</b> —
        לחץ <b>מתקדם</b> (Advanced) ואז <b>המשך אל TriLife</b>. האפליקציה ניגשת
        רק ליומן שלך ולתיקיית הגיבוי שלה, והנתונים נשארים בחשבון שלך.
      </span>
    </p>
  )
}
