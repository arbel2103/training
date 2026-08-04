import type { Account } from './types'
import type { IconName } from '../../../components/ui/Icon'

const GROUP_ICON_NAMES: Record<string, IconName> = {
  חיסכון: 'bank',
  השקעה: 'trendUp',
  פנסיה: 'umbrella',
  'קרן השתלמות': 'graduation',
  'עו"ש': 'wallet',
  עוש: 'wallet',
}

export function groupIconName(name: string): IconName {
  return GROUP_ICON_NAMES[name] ?? 'coins'
}

// קבוצות ברירת מחדל להצעה בעת יצירת חשבון
export const DEFAULT_GROUPS = ['חיסכון', 'השקעה', 'פנסיה', 'קרן השתלמות']

const GROUP_ICONS: Record<string, string> = {
  חיסכון: '🏦',
  השקעה: '📈',
  פנסיה: '👵',
  'קרן השתלמות': '🎓',
  'עו"ש': '💳',
  עוש: '💳',
}

export function groupIcon(name: string): string {
  return GROUP_ICONS[name] ?? '💰'
}

// רשימת הקבוצות הקיימות (לפי סדר הופעה), מתוך החשבונות
export function accountGroups(accounts: Account[]): string[] {
  const seen: string[] = []
  for (const a of accounts) {
    const g = a.group || 'חיסכון'
    if (!seen.includes(g)) seen.push(g)
  }
  return seen
}

// מפתח מיוחד לעו"ש בסינון "סה\"כ הון"
export const CHECKING_KEY = '__checking__'
