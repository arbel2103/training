import { useStore } from '../store/useStore'
import { groupIcon } from '../lib/accountGroups'
import { Select } from './ui/Input'

interface Props {
  accountId?: string
  goalId?: string
  onChange: (accountId?: string, goalId?: string) => void
  className?: string
}

// בורר שיוך הוצאה לחשבון חיסכון/השקעה — ואופציונלית למטרה ספציפית
export function SavingsLinkSelect({ accountId, goalId, onChange, className }: Props) {
  const accounts = useStore((s) => s.accounts)

  const value = goalId ? `goal:${goalId}` : accountId ? `acc:${accountId}` : ''

  const handle = (v: string) => {
    if (!v) return onChange(undefined, undefined)
    if (v.startsWith('acc:')) return onChange(v.slice(4), undefined)
    if (v.startsWith('goal:')) {
      const gid = v.slice(5)
      const acc = accounts.find((a) => a.goals.some((g) => g.id === gid))
      return onChange(acc?.id, gid)
    }
  }

  if (accounts.length === 0) {
    return (
      <p className="text-xs text-muted">
        עדיין לא הוגדרו חשבונות. הוסף חשבון חיסכון/השקעה בדף "הון והשקעות".
      </p>
    )
  }

  return (
    <Select value={value} onChange={(e) => handle(e.target.value)} className={className}>
      <option value="">ללא שיוך</option>
      {accounts.map((a) => (
        <optgroup key={a.id} label={`${groupIcon(a.group)} ${a.name} (${a.group})`}>
          <option value={`acc:${a.id}`}>← כל החשבון</option>
          {a.goals.map((g) => (
            <option key={g.id} value={`goal:${g.id}`}>
              🎯 {g.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  )
}

// תווית לתצוגה של שיוך קיים
export function useSavingLabel() {
  const accounts = useStore((s) => s.accounts)
  return (accountId?: string, goalId?: string): string | null => {
    if (goalId) {
      const acc = accounts.find((a) => a.goals.some((g) => g.id === goalId))
      const goal = acc?.goals.find((g) => g.id === goalId)
      if (goal) return `${acc?.name} · ${goal.name}`
    }
    if (accountId) {
      const acc = accounts.find((a) => a.id === accountId)
      if (acc) return acc.name
    }
    return null
  }
}
