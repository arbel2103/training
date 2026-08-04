import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Tabs } from '../components/ui/Tabs'
import { Card } from '../components/ui/Card'
import { CapitalSummary } from '../components/capital/CapitalSummary'
import { AddAccount } from '../components/capital/AddAccount'
import { AccountCard } from '../components/capital/AccountCard'
import { InvestmentInput } from '../components/capital/InvestmentInput'
import { InvestmentCharts } from '../components/capital/InvestmentCharts'
import { InvestmentHistory } from '../components/capital/InvestmentHistory'

export function CapitalPage() {
  const accounts = useStore((s) => s.accounts)
  const [tab, setTab] = useState('capital')

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">הון והשקעות</h1>
        <p className="text-sm text-muted">תמונת מצב של החסכונות וההשקעות שלך</p>
      </header>

      <Tabs
        tabs={[
          { id: 'capital', label: 'מעקב הון' },
          { id: 'invest', label: 'מעקב השקעה' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'capital' && (
        <div className="space-y-5">
          <CapitalSummary />

          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-800">החשבונות שלי</h2>
            <AddAccount />
          </div>

          {accounts.length === 0 ? (
            <Card>
              <p className="py-6 text-center text-sm text-muted">
                עדיין לא הוספת חשבונות. לחץ על "הוספת חשבון" כדי להתחיל.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {accounts.map((a) => (
                <AccountCard key={a.id} account={a} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'invest' && (
        <div className="space-y-5">
          <InvestmentInput />
          <InvestmentCharts />
          <InvestmentHistory />
        </div>
      )}
    </div>
  )
}
