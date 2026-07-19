import { useEffect, useRef, useState } from 'react'
import { formatPace } from '../../lib/calc'

interface PaceInputProps {
  /** pace in seconds */
  value?: number
  onChange: (sec: number | undefined) => void
  placeholder?: string
}

/** "530" → "5:30", "45" → "0:45" — digits fill in from the right. */
function digitsToDisplay(digits: string): string {
  if (!digits) return ''
  if (digits.length <= 2) return `0:${digits.padStart(2, '0')}`
  return `${digits.slice(0, -2)}:${digits.slice(-2)}`
}

function digitsToSeconds(digits: string): number | undefined {
  if (!digits) return undefined
  const sec = digits.length <= 2 ? Number(digits) : Number(digits.slice(-2))
  const min = digits.length <= 2 ? 0 : Number(digits.slice(0, -2))
  return min * 60 + sec
}

/**
 * Pace entry as m:ss (e.g. 5:30 per km, 1:30 per 100m). Accepts digits only
 * and inserts the colon automatically, so it works with the phone's numeric
 * keypad (which has no colon key).
 */
export default function PaceInput({ value, onChange, placeholder }: PaceInputProps) {
  const [display, setDisplay] = useState(value != null ? formatPace(value) : '')
  const lastEmitted = useRef<number | undefined>(value)

  // re-sync only on external value changes (e.g. modal reset) — not our own
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setDisplay(value != null ? formatPace(value) : '')
      lastEmitted.current = value
    }
  }, [value])

  const handle = (raw: string) => {
    // strip leading zeros so the padded "0:0X" display doesn't feed back in
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 4)
    const sec = digitsToSeconds(digits)
    lastEmitted.current = sec
    setDisplay(digitsToDisplay(digits))
    onChange(sec)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      className="input text-center"
      placeholder={placeholder ?? '0:00'}
      value={display}
      onChange={(e) => handle(e.target.value)}
    />
  )
}
