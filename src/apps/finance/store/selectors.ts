import type {
  Account,
  Expense,
  Goal,
  InvestmentEntry,
  MonthData,
  MonthKey,
} from '../lib/types'
import { accountGroups, CHECKING_KEY } from '../lib/accountGroups'

// סכום אפקטיבי של הוצאה: סכום חיוב (או עסקה אם בקליטה) פחות החזר.
// יכול להיות שלילי עבור זיכויים/החזרים — כך שהם מתקזזים בסיכומים.
export function effectiveAmount(e: Expense): number {
  const base = e.chargeAmount ?? e.txnAmount
  return base - (e.refund || 0)
}

export function monthExpenses(expenses: Expense[], mk: MonthKey): Expense[] {
  return expenses.filter((e) => e.monthKey === mk)
}

// סך הוצאות אשראי (בלי העברות בנקאיות ידניות)
export function creditTotal(expenses: Expense[], mk: MonthKey): number {
  return monthExpenses(expenses, mk).reduce((s, e) => s + effectiveAmount(e), 0)
}

export function bankTransfersTotal(month: MonthData | undefined): number {
  if (!month) return 0
  return month.bankTransfers.reduce((s, t) => s + t.amount, 0)
}

// סך הוצאות חודשי כולל = אשראי + העברות בנקאיות
export function monthTotalSpending(
  expenses: Expense[],
  month: MonthData | undefined,
  mk: MonthKey,
): number {
  return creditTotal(expenses, mk) + bankTransfersTotal(month)
}

export function monthIncome(month: MonthData | undefined): number {
  if (!month) return 0
  return (
    month.salary + month.extraIncome.reduce((s, i) => s + i.amount, 0)
  )
}

export interface CategorySlice {
  category: string
  value: number
}

// התפלגות לפי קטגוריה (לעוגה) — מאוחד לפי קטגוריה קנונית
export function categoryBreakdown(
  expenses: Expense[],
  mk: MonthKey,
): CategorySlice[] {
  const map = new Map<string, number>()
  for (const e of monthExpenses(expenses, mk)) {
    map.set(e.category, (map.get(e.category) || 0) + effectiveAmount(e))
  }
  return [...map.entries()]
    .map(([category, value]) => ({ category, value }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
}

export function topCategory(
  expenses: Expense[],
  mk: MonthKey,
): { category: string; value: number } | null {
  const b = categoryBreakdown(expenses, mk)
  return b.length ? b[0] : null
}

export function transactionCount(expenses: Expense[], mk: MonthKey): number {
  return monthExpenses(expenses, mk).length
}

export interface CardSlice {
  card: string
  value: number
  count: number
}

// פירוט הוצאות לפי כרטיס אשראי (מהגבוה לנמוך)
export function cardBreakdown(expenses: Expense[], mk: MonthKey): CardSlice[] {
  const map = new Map<string, { value: number; count: number }>()
  for (const e of monthExpenses(expenses, mk)) {
    const key = e.card || 'כרטיס'
    const cur = map.get(key) || { value: 0, count: 0 }
    cur.value += effectiveAmount(e)
    cur.count += 1
    map.set(key, cur)
  }
  return [...map.entries()]
    .map(([card, v]) => ({ card, value: v.value, count: v.count }))
    .sort((a, b) => b.value - a.value)
}

export function averageTransaction(expenses: Expense[], mk: MonthKey): number {
  const list = monthExpenses(expenses, mk)
  if (!list.length) return 0
  return creditTotal(expenses, mk) / list.length
}

// ===== הון =====

export function accountByGoalId(
  accounts: Account[],
  goalId: string | undefined,
): Account | undefined {
  if (!goalId) return undefined
  return accounts.find((a) => a.goals.some((g) => g.id === goalId))
}

// שיוך חיסכון מנורמל — סכום, חשבון (מזוהה גם דרך המטרה), מטרה, ותאריך ההוצאה
export interface SavingLink {
  accountId?: string
  goalId?: string
  amount: number
  date?: string // yyyy-mm-dd — מתי בוצעה ההוצאה/העברה
}

// איסוף כל השיוכים לחיסכון/השקעה — מהוצאות אשראי ומהעברות בנקאיות.
// אם יש שיוך למטרה בלבד, החשבון נגזר מהמטרה (תאימות לאחור).
export function collectSavingLinks(
  expenses: Expense[],
  months: Record<MonthKey, MonthData>,
  accounts: Account[],
): SavingLink[] {
  const resolve = (accountId?: string, goalId?: string): string | undefined =>
    accountId ?? (goalId ? accountByGoalId(accounts, goalId)?.id : undefined)

  const links: SavingLink[] = []
  for (const e of expenses) {
    if (e.savingsAccountId || e.savingsGoalId) {
      links.push({
        accountId: resolve(e.savingsAccountId, e.savingsGoalId),
        goalId: e.savingsGoalId,
        amount: effectiveAmount(e),
        date: e.date,
      })
    }
  }
  for (const [mk, m] of Object.entries(months)) {
    for (const t of m.bankTransfers) {
      if (t.savingsAccountId || t.savingsGoalId) {
        links.push({
          accountId: resolve(t.savingsAccountId, t.savingsGoalId),
          goalId: t.savingsGoalId,
          amount: t.amount,
          date: `${mk}-15`, // אמצע החודש (להעברות אין תאריך יום מדויק)
        })
      }
    }
  }
  return links
}

// סך ההוצאות ששויכו לחשבון — רק אלו שאירעו *אחרי* עדכון היתרה האחרון.
// הוצאות שקדמו לעדכון כבר משתקפות ביתרה הרשומה, כך שהן יורדות פעם אחת בלבד
// ולא שוב כשמעדכנים ידנית את היתרה למצב הנוכחי.
export function accountLinkedTotal(
  account: Account,
  links: SavingLink[],
): number {
  const since = account.updatedAt ? account.updatedAt.slice(0, 10) : ''
  return links
    .filter((l) => l.accountId === account.id)
    .filter((l) => l.date == null || l.date > since)
    .reduce((s, l) => s + l.amount, 0)
}

// יתרה אפקטיבית = יתרה ידנית פחות הוצאות משויכות שטרם שוקללו ביתרה
export function accountEffectiveBalance(
  account: Account,
  links: SavingLink[],
): number {
  return account.balance - accountLinkedTotal(account, links)
}

// סכום ששויך למטרה
export function goalAllocated(goal: Goal, links: SavingLink[]): number {
  return links
    .filter((l) => l.goalId === goal.id)
    .reduce((s, l) => s + l.amount, 0)
}

// כמה חסר למטרה (null אם אין יעד)
export function goalRemaining(goal: Goal, links: SavingLink[]): number | null {
  if (goal.targetAmount === undefined || goal.targetAmount === null) return null
  return Math.max(0, goal.targetAmount - goalAllocated(goal, links))
}

// סך החסר לכל מטרות החשבון (רק מטרות עם יעד)
export function accountRemainingToGoals(
  account: Account,
  links: SavingLink[],
): number {
  return account.goals.reduce((s, g) => {
    const r = goalRemaining(g, links)
    return s + (r ?? 0)
  }, 0)
}

export function totalByGroup(
  accounts: Account[],
  links: SavingLink[],
  group: string,
): number {
  return accounts
    .filter((a) => (a.group || 'חיסכון') === group)
    .reduce((s, a) => s + accountEffectiveBalance(a, links), 0)
}

// סה"כ הון — סכום הקבוצות והעו"ש, פרט למה שהמשתמש סינן החוצה
export function totalCapital(
  accounts: Account[],
  links: SavingLink[],
  checkingAmount: number,
  excluded: string[] = [],
): number {
  let sum = 0
  for (const g of accountGroups(accounts)) {
    if (!excluded.includes(g)) sum += totalByGroup(accounts, links, g)
  }
  if (!excluded.includes(CHECKING_KEY)) sum += checkingAmount
  return sum
}

// ===== השקעות =====

export function investmentsByMonth(
  investments: InvestmentEntry[],
  mk: MonthKey,
): InvestmentEntry[] {
  return investments.filter((i) => i.monthKey === mk)
}

export function investmentMonthTotal(
  investments: InvestmentEntry[],
  mk: MonthKey,
): number {
  return investmentsByMonth(investments, mk).reduce((s, i) => s + i.amount, 0)
}

// ===== כללי =====

// כל החודשים שיש בהם נתונים (מהישן לחדש)
export function allDataMonths(
  months: Record<MonthKey, MonthData>,
  expenses: Expense[],
  investments: InvestmentEntry[],
): MonthKey[] {
  const set = new Set<MonthKey>(Object.keys(months))
  expenses.forEach((e) => set.add(e.monthKey))
  investments.forEach((i) => set.add(i.monthKey))
  return [...set].sort()
}
