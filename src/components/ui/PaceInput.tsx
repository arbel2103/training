import { formatPace, parsePace } from '../../lib/calc'

interface PaceInputProps {
  /** pace in seconds */
  value?: number
  onChange: (sec: number | undefined) => void
  placeholder?: string
}

/**
 * Free-text "m:ss" pace entry (e.g. 5:30 per km, 1:30 per 100m).
 * Stores the parsed seconds; shows the formatted value.
 */
export default function PaceInput({ value, onChange, placeholder }: PaceInputProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      className="input text-center"
      placeholder={placeholder ?? '0:00'}
      defaultValue={value != null ? formatPace(value) : ''}
      onBlur={(e) => onChange(parsePace(e.target.value))}
    />
  )
}
