import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { emptyMonth } from '../store/useStore'
import {
  categoryBreakdown,
  effectiveAmount,
  monthExpenses,
  monthTotalSpending,
} from '../store/selectors'
import type { Expense, MonthKey } from '../lib/types'
import { addMonths, monthLabel, monthLabelShort } from '../lib/date'
import { formatCard } from '../lib/format'
import { CATEGORY_NAMES } from '../lib/categories'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Tabs } from '../components/ui/Tabs'
import { Select } from '../components/ui/Input'
import { MonthPicker } from '../components/expenses/MonthPicker'
import { SummaryCards } from '../components/expenses/SummaryCards'
import { IncomeRow } from '../components/expenses/IncomeRow'
import { ManualExpenseButton } from '../components/expenses/ManualExpenseButton'
import { BitModal } from '../components/expenses/BitModal'
import Icon from '../../../components/ui/Icon'
import InfoTip from '../../../components/ui/InfoTip'
import { ImportBanner } from '../components/ImportBanner'
import { CategoryPie } from '../components/expenses/CategoryPie'
import { ExpenseList } from '../components/expenses/ExpenseList'
import { MonthlyBarChart } from '../components/expenses/MonthlyBarChart'
import { RangePicker } from '../components/expenses/RangePicker'
import type { RangeValue } from '../components/expenses/RangePicker'

export function ExpensesPage() {
  const selectedMonth = useStore((s) => s.selectedMonth)
  const setSelectedMonth = useStore((s) => s.setSelectedMonth)
  const expenses = useStore((s) => s.expenses)
  const months = useStore((s) => s.months)
  const categoryMap = useStore((s) => s.categoryMap)
  const commitImport = useStore((s) => s.commitImport)

  const month = months[selectedMonth] ?? emptyMonth()
  const importedMonths = useMemo(
    () =>
      new Set(
        Object.entries(months)
          .filter(([, m]) => m.imported)
          .map(([k]) => k),
      ),
    [months],
  )

  // ===== ייבוא אקסל =====
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Expense[]>([])
  const [pendingMonth, setPendingMonth] = useState<MonthKey>(selectedMonth)
  const [pendingCards, setPendingCards] = useState<string[]>([])
  const [bitOpen, setBitOpen] = useState(false)

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer()
      // טעינה דינמית של מנוע האקסל (xlsx) רק בעת הצורך — מקטין את ה-bundle הראשוני
      const { parseExpensesFromBuffer } = await import('../lib/excel')
      const res = parseExpensesFromBuffer(buf, categoryMap, file.name)
      if (!res.expenses.length || !res.monthKey) {
        alert('לא נמצאו עסקאות עם תאריך תקין בקובץ.')
        return
      }
      // החודש והכרטיסים נקבעים אוטומטית מתוך הקובץ
      const target = res.monthKey
      const cardSet = new Set(res.cards)
      const alreadyHas = expenses.some(
        (e) => e.monthKey === target && cardSet.has(e.card),
      )
      if (alreadyHas) {
        const label = res.cards.map(formatCard).join(', ')
        const ok = window.confirm(
          `כבר נטענו נתונים לכרטיס ${label} בחודש ${monthLabel(target)}. להחליף אותם בקובץ החדש?`,
        )
        if (!ok) return
      }
      setSelectedMonth(target) // מעבר אוטומטי לחודש שזוהה
      setPendingMonth(target)
      setPendingCards(res.cards)
      setPending(res.expenses)
      const bits = res.expenses.filter((e) => e.isBit)
      if (bits.length) {
        setBitOpen(true)
      } else {
        commitImport(target, res.cards, res.expenses)
      }
    } catch (err) {
      alert((err as Error).message || 'שגיאה בקריאת הקובץ')
    }
  }

  const updatePendingCategory = (id: string, category: string) =>
    setPending((list) =>
      list.map((e) => (e.id === id ? { ...e, category } : e)),
    )

  const confirmBit = () => {
    commitImport(pendingMonth, pendingCards, pending)
    setBitOpen(false)
    setPending([])
  }

  // ===== טאבים =====
  const [tab, setTab] = useState('list')

  return (
    <div className="space-y-5">
      <ImportBanner />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">מעקב הוצאות</h1>
          <p className="text-sm text-muted">{monthLabel(selectedMonth)}</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            importedMonths={importedMonths}
          />
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
          <ManualExpenseButton />
          <Button onClick={() => fileRef.current?.click()} className="gap-1.5">
            <Icon name="upload" className="w-4 h-4" /> טען אקסל
          </Button>
        </div>
      </header>

      <SummaryCards expenses={expenses} month={month} mk={selectedMonth} />

      <IncomeRow month={month} mk={selectedMonth} />

      <Tabs
        tabs={[
          { id: 'list', label: 'ריכוז ורשימה' },
          { id: 'trend', label: 'מגמה חודשית' },
          { id: 'cattrend', label: 'מגמה לפי קטגוריה' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'list' && (
        <SummaryAndList expenses={expenses} mk={selectedMonth} />
      )}
      {tab === 'trend' && <TrendTab />}
      {tab === 'cattrend' && <CategoryTrendTab />}

      <BitModal
        open={bitOpen}
        rows={pending.filter((e) => e.isBit)}
        onChangeCategory={updatePendingCategory}
        onConfirm={confirmBit}
      />
    </div>
  )
}

// ===== טאב 1: ריכוז ורשימה =====
function SummaryAndList({ expenses, mk }: { expenses: Expense[]; mk: MonthKey }) {
  const [filter, setFilter] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const data = useMemo(() => categoryBreakdown(expenses, mk), [expenses, mk])
  const list = useMemo(() => {
    const all = monthExpenses(expenses, mk).sort((a, b) =>
      a.date < b.date ? 1 : -1,
    )
    const byCat = filter ? all.filter((e) => e.category === filter) : all
    const q = query.trim().toLowerCase()
    if (!q) return byCat
    return byCat.filter(
      (e) =>
        e.merchant.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q),
    )
  }, [expenses, mk, filter, query])

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-ink">
            התפלגות לפי קטגוריות
          </h3>
          <InfoTip text="חלוקת ההוצאות של החודש הנבחר לפי קטגוריה. גודל הפרוסה = חלקה של הקטגוריה מסך ההוצאות. הקש על פרוסה כדי לסנן את הרשימה למטה לאותה קטגוריה." />
        </div>
        <CategoryPie data={data} activeCategory={filter} onSlice={setFilter} />
      </Card>

      <Card padded={false}>
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="text-sm font-medium text-ink">
            רשימת הוצאות
            {filter && (
              <span className="text-muted"> · מסונן לפי "{filter}"</span>
            )}
          </h3>
          {filter && (
            <Button size="sm" variant="ghost" onClick={() => setFilter(null)} className="gap-1">
              נקה סינון <Icon name="x" className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <div className="px-5 pb-2">
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute right-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי בית עסק או קטגוריה…"
              className="w-full rounded-xl border border-line bg-bg py-2 pr-9 pl-9 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="נקה חיפוש"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <Icon name="x" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="px-5 pb-4">
          <ExpenseList expenses={list} />
        </div>
      </Card>
    </div>
  )
}

// ===== עזר: רשימת חודשים לבחירה מותאמת =====
function useMonthOptions(anchor: MonthKey): MonthKey[] {
  const months = useStore((s) => s.months)
  const expenses = useStore((s) => s.expenses)
  return useMemo(() => {
    const set = new Set<MonthKey>()
    for (let i = 0; i < 12; i++) set.add(addMonths(anchor, -i))
    Object.keys(months).forEach((m) => set.add(m))
    expenses.forEach((e) => set.add(e.monthKey))
    return [...set].sort()
  }, [anchor, months, expenses])
}

function rangeMonths(range: RangeValue, anchor: MonthKey): MonthKey[] {
  if (range.preset === 'custom') {
    const out: MonthKey[] = []
    let cur = range.from <= range.to ? range.from : range.to
    const end = range.from <= range.to ? range.to : range.from
    let guard = 0
    while (cur <= end && guard < 120) {
      out.push(cur)
      cur = addMonths(cur, 1)
      guard++
    }
    return out
  }
  const n = range.preset
  const out: MonthKey[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addMonths(anchor, -i))
  return out
}

// ===== טאב 2: מגמה חודשית כללית =====
function TrendTab() {
  const selectedMonth = useStore((s) => s.selectedMonth)
  const expenses = useStore((s) => s.expenses)
  const months = useStore((s) => s.months)
  const monthOptions = useMonthOptions(selectedMonth)
  const [range, setRange] = useState<RangeValue>({
    preset: 6,
    from: addMonths(selectedMonth, -5),
    to: selectedMonth,
  })

  const data = useMemo(() => {
    return rangeMonths(range, selectedMonth).map((mk) => ({
      label: monthLabelShort(mk),
      value: monthTotalSpending(expenses, months[mk], mk),
      highlight: mk === selectedMonth,
    }))
  }, [range, selectedMonth, expenses, months])

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-ink">סך הוצאות לפי חודש</h3>
          <InfoTip text="סך ההוצאות בכל חודש לאורך התקופה שבחרת, כדי לראות מגמה. העמודה המודגשת היא החודש הנבחר. הקש על עמודה לראות את הסכום המדויק." />
        </div>
        <RangePicker value={range} onChange={setRange} monthOptions={monthOptions} />
      </div>
      <MonthlyBarChart data={data} />
    </Card>
  )
}

// ===== טאב 3: מגמה לפי קטגוריה =====
function CategoryTrendTab() {
  const selectedMonth = useStore((s) => s.selectedMonth)
  const expenses = useStore((s) => s.expenses)
  const customCategories = useStore((s) => s.customCategories)
  const monthOptions = useMonthOptions(selectedMonth)
  const categoryNames = [
    ...CATEGORY_NAMES,
    ...customCategories.map((c) => c.name),
  ]
  const [category, setCategory] = useState(CATEGORY_NAMES[0])
  const [range, setRange] = useState<RangeValue>({
    preset: 6,
    from: addMonths(selectedMonth, -5),
    to: selectedMonth,
  })

  const data = useMemo(() => {
    return rangeMonths(range, selectedMonth).map((mk) => ({
      label: monthLabelShort(mk),
      value: monthExpenses(expenses, mk)
        .filter((e) => e.category === category)
        .reduce((s, e) => s + effectiveAmount(e), 0),
      highlight: mk === selectedMonth,
    }))
  }, [range, selectedMonth, expenses, category])

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">קטגוריה:</span>
          <div className="w-48">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categoryNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <InfoTip text="כמה הוצאת בקטגוריה שבחרת בכל חודש לאורך התקופה, כדי לזהות מגמת עלייה או ירידה. העמודה המודגשת היא החודש הנבחר." />
        </div>
        <RangePicker value={range} onChange={setRange} monthOptions={monthOptions} />
      </div>
      <MonthlyBarChart data={data} color="#7b6bb0" />
    </Card>
  )
}
