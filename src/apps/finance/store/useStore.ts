import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Account,
  Checking,
  Expense,
  InvestmentEntry,
  MonthData,
  MonthKey,
} from '../lib/types'
import type { CategoryDef } from '../lib/categories'
import { CATEGORY_NAMES, nextCustomColor } from '../lib/categories'
import { currentMonthKey } from '../lib/date'

function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// מזהה כרטיס לנתונים שיובאו לפני תמיכת ריבוי-כרטיסים
const LEGACY_CARD = 'כרטיס'
// מזהה ל"כרטיס" של הוצאות ידניות
const MANUAL_CARD = 'ידני'

export function emptyMonth(): MonthData {
  return { imported: false, salary: 0, extraIncome: [], bankTransfers: [] }
}

interface State {
  months: Record<MonthKey, MonthData>
  expenses: Expense[]
  categoryMap: Record<string, string>
  customCategories: CategoryDef[]
  checking: Checking
  accounts: Account[]
  investments: InvestmentEntry[]
  capitalExcluded: string[] // קבוצות/עו"ש שהוצאו מחישוב "סה\"כ הון"
  selectedMonth: MonthKey

  // ניווט
  setSelectedMonth: (mk: MonthKey) => void

  // ייבוא והוצאות
  commitImport: (mk: MonthKey, cards: string[], expenses: Expense[]) => void
  removeCard: (mk: MonthKey, card: string) => void
  clearMonthExpenses: (mk: MonthKey) => void
  addManualExpense: (
    mk: MonthKey,
    label: string,
    amount: number,
    category: string,
  ) => void
  removeExpense: (id: string) => void
  updateExpenseCategory: (id: string, category: string) => void
  setExpenseRefund: (id: string, refund: number) => void
  setExpenseSaving: (
    id: string,
    accountId: string | undefined,
    goalId: string | undefined,
  ) => void

  // קטגוריות מותאמות אישית
  addCustomCategory: (name: string) => void
  removeCustomCategory: (name: string) => void

  // הכנסות והעברות
  setSalary: (mk: MonthKey, amount: number) => void
  addExtraIncome: (mk: MonthKey, label: string, amount: number) => void
  removeExtraIncome: (mk: MonthKey, id: string) => void
  addBankTransfer: (mk: MonthKey, label: string, amount: number) => void
  removeBankTransfer: (mk: MonthKey, id: string) => void
  setBankTransferSaving: (
    mk: MonthKey,
    id: string,
    accountId: string | undefined,
    goalId: string | undefined,
  ) => void

  // הון
  setChecking: (amount: number, fromMonth?: string) => void
  addAccount: (name: string, group: string) => void
  removeAccount: (id: string) => void
  updateAccountBalance: (id: string, balance: number) => void
  renameAccount: (id: string, name: string) => void
  setAccountGroup: (id: string, group: string) => void
  toggleCapitalExcluded: (key: string) => void
  addGoal: (accountId: string, name: string, targetAmount?: number) => void
  removeGoal: (accountId: string, goalId: string) => void

  // השקעות
  addInvestment: (mk: MonthKey, amount: number, accountId: string) => void
  removeInvestment: (id: string) => void
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      months: {},
      expenses: [],
      categoryMap: {},
      customCategories: [],
      checking: { amount: 0, updatedAt: new Date().toISOString() },
      accounts: [],
      investments: [],
      capitalExcluded: [],
      selectedMonth: currentMonthKey(),

      setSelectedMonth: (mk) => set({ selectedMonth: mk }),

      commitImport: (mk, cards, expenses) =>
        set((s) => {
          // ההחלפה היא לפי טווח התאריכים שהקובץ באמת מכסה, ולא לפי חודש.
          //
          // דוח אשראי נחתך ב-20 בחודש, ולכן שני דוחות עוקבים תורמים לאותו
          // חודש: הדוח של יולי מביא את 1–20 ביולי, והדוח של אוגוסט מביא את
          // 20–31 ביולי. מחיקה של חודש שלם לפני הכתיבה הייתה מוחקת את החלק
          // שהגיע מהדוח הקודם — דוח אחד לעולם לא מכסה חודש שלם.
          // החלפה לפי הטווח מוחקת בדיוק את מה שהקובץ הזה אמור להחליף.
          const cardSet = new Set(cards)
          const dates = expenses.map((e) => e.date).sort()
          const from = dates[0]
          const to = dates[dates.length - 1]
          const others = s.expenses.filter((e) => {
            if (!cardSet.has(e.card) && e.card !== LEGACY_CARD) return true
            if (!from || e.date < from || e.date > to) return true
            return false
          })
          const touched = new Set<MonthKey>(expenses.map((e) => e.monthKey))
          touched.add(mk)
          const months = { ...s.months }
          for (const key of touched) {
            months[key] = { ...(s.months[key] ?? emptyMonth()), imported: true }
          }
          return { expenses: [...others, ...expenses], months }
        }),

      removeCard: (mk, card) =>
        set((s) => {
          const expenses = s.expenses.filter(
            (e) => !(e.monthKey === mk && e.card === card),
          )
          // אם לא נשארו הוצאות לחודש — בטל את סימון "נטען"
          const stillHas = expenses.some((e) => e.monthKey === mk)
          const month = s.months[mk] ?? emptyMonth()
          return {
            expenses,
            months: { ...s.months, [mk]: { ...month, imported: stillHas } },
          }
        }),

      addCustomCategory: (name) =>
        set((s) => {
          const trimmed = name.trim()
          if (!trimmed) return {}
          // לא להוסיף אם כבר קיים (קנוני או מותאם)
          if (
            CATEGORY_NAMES.includes(trimmed) ||
            s.customCategories.some((c) => c.name === trimmed)
          ) {
            return {}
          }
          return {
            customCategories: [
              ...s.customCategories,
              {
                name: trimmed,
                color: nextCustomColor(s.customCategories.length),
                icon: '🏷️',
              },
            ],
          }
        }),

      removeCustomCategory: (name) =>
        set((s) => ({
          customCategories: s.customCategories.filter((c) => c.name !== name),
        })),

      clearMonthExpenses: (mk) =>
        set((s) => {
          const month = s.months[mk] ?? emptyMonth()
          return {
            expenses: s.expenses.filter((e) => e.monthKey !== mk),
            months: { ...s.months, [mk]: { ...month, imported: false } },
          }
        }),

      addManualExpense: (mk, label, amount, category) =>
        set((s) => ({
          expenses: [
            ...s.expenses,
            {
              id: uid('man'),
              monthKey: mk,
              card: MANUAL_CARD,
              date: `${mk}-01`,
              merchant: label,
              rawCategory: category,
              category,
              txnAmount: amount,
              chargeAmount: amount,
              refund: 0,
              pending: false,
              isBit: false,
              isManual: true,
            },
          ],
        })),

      removeExpense: (id) =>
        set((s) => ({
          expenses: s.expenses.filter((e) => e.id !== id),
        })),

      updateExpenseCategory: (id, category) =>
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === id ? { ...e, category } : e,
          ),
        })),

      setExpenseRefund: (id, refund) =>
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === id ? { ...e, refund: Math.max(0, refund) } : e,
          ),
        })),

      setExpenseSaving: (id, accountId, goalId) =>
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === id
              ? { ...e, savingsAccountId: accountId, savingsGoalId: goalId }
              : e,
          ),
        })),

      setSalary: (mk, amount) =>
        set((s) => {
          const month = s.months[mk] ?? emptyMonth()
          return { months: { ...s.months, [mk]: { ...month, salary: amount } } }
        }),

      addExtraIncome: (mk, label, amount) =>
        set((s) => {
          const month = s.months[mk] ?? emptyMonth()
          return {
            months: {
              ...s.months,
              [mk]: {
                ...month,
                extraIncome: [
                  ...month.extraIncome,
                  { id: uid('inc'), label, amount },
                ],
              },
            },
          }
        }),

      removeExtraIncome: (mk, id) =>
        set((s) => {
          const month = s.months[mk] ?? emptyMonth()
          return {
            months: {
              ...s.months,
              [mk]: {
                ...month,
                extraIncome: month.extraIncome.filter((x) => x.id !== id),
              },
            },
          }
        }),

      addBankTransfer: (mk, label, amount) =>
        set((s) => {
          const month = s.months[mk] ?? emptyMonth()
          return {
            months: {
              ...s.months,
              [mk]: {
                ...month,
                bankTransfers: [
                  ...month.bankTransfers,
                  { id: uid('bt'), label, amount },
                ],
              },
            },
          }
        }),

      removeBankTransfer: (mk, id) =>
        set((s) => {
          const month = s.months[mk] ?? emptyMonth()
          return {
            months: {
              ...s.months,
              [mk]: {
                ...month,
                bankTransfers: month.bankTransfers.filter((x) => x.id !== id),
              },
            },
          }
        }),

      setBankTransferSaving: (mk, id, accountId, goalId) =>
        set((s) => {
          const month = s.months[mk] ?? emptyMonth()
          return {
            months: {
              ...s.months,
              [mk]: {
                ...month,
                bankTransfers: month.bankTransfers.map((t) =>
                  t.id === id
                    ? { ...t, savingsAccountId: accountId, savingsGoalId: goalId }
                    : t,
                ),
              },
            },
          }
        }),

      setChecking: (amount, fromMonth) =>
        set({
          checking: { amount, updatedAt: new Date().toISOString(), fromMonth },
        }),

      addAccount: (name, group) =>
        set((s) => ({
          accounts: [
            ...s.accounts,
            {
              id: uid('acc'),
              name,
              group: group.trim() || 'חיסכון',
              balance: 0,
              updatedAt: new Date().toISOString(),
              goals: [],
            },
          ],
        })),

      removeAccount: (id) =>
        set((s) => {
          const acc = s.accounts.find((a) => a.id === id)
          const goalIds = new Set(acc?.goals.map((g) => g.id) ?? [])
          const linkedToAcc = (aid?: string, gid?: string) =>
            aid === id || (gid ? goalIds.has(gid) : false)
          const clear = <T extends { savingsAccountId?: string; savingsGoalId?: string }>(
            x: T,
          ): T =>
            linkedToAcc(x.savingsAccountId, x.savingsGoalId)
              ? { ...x, savingsAccountId: undefined, savingsGoalId: undefined }
              : x
          return {
            accounts: s.accounts.filter((a) => a.id !== id),
            investments: s.investments.filter((i) => i.accountId !== id),
            expenses: s.expenses.map(clear),
            months: Object.fromEntries(
              Object.entries(s.months).map(([mk, m]) => [
                mk,
                { ...m, bankTransfers: m.bankTransfers.map(clear) },
              ]),
            ),
          }
        }),

      updateAccountBalance: (id, balance) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === id
              ? { ...a, balance, updatedAt: new Date().toISOString() }
              : a,
          ),
        })),

      renameAccount: (id, name) =>
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, name } : a)),
        })),

      setAccountGroup: (id, group) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === id ? { ...a, group: group.trim() || a.group } : a,
          ),
        })),

      toggleCapitalExcluded: (key) =>
        set((s) => ({
          capitalExcluded: s.capitalExcluded.includes(key)
            ? s.capitalExcluded.filter((k) => k !== key)
            : [...s.capitalExcluded, key],
        })),

      addGoal: (accountId, name, targetAmount) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === accountId
              ? {
                  ...a,
                  goals: [...a.goals, { id: uid('goal'), name, targetAmount }],
                }
              : a,
          ),
        })),

      removeGoal: (accountId, goalId) =>
        set((s) => {
          // הסרת המטרה בלבד — השיוך לחשבון נשמר (עדיין מוריד מהיתרה)
          const dropGoal = <T extends { savingsGoalId?: string }>(x: T): T =>
            x.savingsGoalId === goalId ? { ...x, savingsGoalId: undefined } : x
          return {
            accounts: s.accounts.map((a) =>
              a.id === accountId
                ? { ...a, goals: a.goals.filter((g) => g.id !== goalId) }
                : a,
            ),
            expenses: s.expenses.map(dropGoal),
            months: Object.fromEntries(
              Object.entries(s.months).map(([mk, m]) => [
                mk,
                { ...m, bankTransfers: m.bankTransfers.map(dropGoal) },
              ]),
            ),
          }
        }),

      addInvestment: (mk, amount, accountId) =>
        set((s) => ({
          investments: [
            ...s.investments,
            { id: uid('inv'), monthKey: mk, amount, accountId },
          ],
        })),

      removeInvestment: (id) =>
        set((s) => ({
          investments: s.investments.filter((i) => i.id !== id),
        })),
    }),
    {
      name: 'finance-store',
      version: 4,
      migrate: (persisted, version) => {
        const state = persisted as State
        // v2: הוספת שדה card להוצאות שיובאו לפני תמיכת ריבוי-כרטיסים
        if (version < 2 && state?.expenses) {
          state.expenses = state.expenses.map((e) => ({
            ...e,
            card: e.card || LEGACY_CARD,
          }))
        }
        // v3: הוספת רשימת קטגוריות מותאמות
        if (version < 3 && state && !state.customCategories) {
          state.customCategories = []
        }
        // v4: המרת type→group (חיסכון/השקעה) + סינון סה"כ הון
        if (version < 4 && state) {
          state.accounts = (state.accounts ?? []).map((a) => {
            const legacy = a as Account & { type?: string }
            return {
              ...a,
              group:
                a.group ?? (legacy.type === 'investment' ? 'השקעה' : 'חיסכון'),
            }
          })
          if (!state.capitalExcluded) state.capitalExcluded = []
        }
        return state
      },
    },
  ),
)
