// פורמט מטבע ומספרים בעברית

const ils = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
})

const ilsPrecise = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const num = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 })

export function formatCurrency(value: number, precise = false): string {
  if (!isFinite(value)) return '—'
  return precise ? ilsPrecise.format(value) : ils.format(value)
}

export function formatNumber(value: number): string {
  return num.format(value)
}

export function formatPercent(value: number): string {
  if (!isFinite(value)) return '—'
  return `${Math.round(value)}%`
}

// תווית כרטיס: 4 ספרות → "••••8806", אחרת הערך כמו שהוא
export function formatCard(card: string): string {
  return /^\d{3,4}$/.test(card) ? `••••${card}` : card
}
