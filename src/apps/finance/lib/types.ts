// ===== טיפוסים מרכזיים =====

export type MonthKey = string // "2026-05"

export interface Expense {
  id: string
  monthKey: MonthKey
  card: string // מזהה כרטיס האשראי (4 ספרות אחרונות / שם הקובץ)
  date: string // ISO date
  merchant: string
  rawCategory: string // "ענף" מהאקסל
  category: string // קטגוריה קנונית (אחרי מיפוי / עריכה ידנית)
  txnAmount: number // סכום עסקה (C)
  chargeAmount: number | null // סכום חיוב (D) — null לעסקאות בקליטה
  refund: number // החזר מחבר (ברירת מחדל 0)
  pending: boolean
  isBit: boolean // האם זוהתה כהעברת ביט / "שונות"
  isManual?: boolean // הוצאה שהוזנה ידנית (לא מאקסל)
  savingsAccountId?: string // שיוך לחשבון חיסכון/השקעה (מוריד מהיתרה)
  savingsGoalId?: string // שיוך למטרת חיסכון ספציפית (אופציונלי)
}

export interface IncomeItem {
  id: string
  label: string
  amount: number
}

// העברה בנקאית — הוצאה ידנית שאפשר לשייך לחיסכון/השקעה
export interface BankTransfer {
  id: string
  label: string
  amount: number
  savingsAccountId?: string
  savingsGoalId?: string
}

export interface MonthData {
  imported: boolean
  salary: number
  extraIncome: IncomeItem[]
  bankTransfers: BankTransfer[] // הוצאות גדולות ידניות (לא באשראי)
}

export interface Goal {
  id: string
  name: string
  targetAmount?: number
}

// סוג/קבוצת חשבון — שם חופשי שהמשתמש קובע (חיסכון, השקעה, פנסיה, קרן השתלמות...)
export interface Account {
  id: string
  name: string
  group: string
  balance: number // יתרה ידנית
  updatedAt: string // ISO
  goals: Goal[]
}

export interface Checking {
  amount: number
  updatedAt: string
}

export interface InvestmentEntry {
  id: string
  monthKey: MonthKey
  amount: number
  accountId: string
}
