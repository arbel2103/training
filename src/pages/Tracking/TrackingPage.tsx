import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import TabBar from '../../components/ui/TabBar'
import EntryTab from './EntryTab'
import HistoryTab from './HistoryTab'

type Tab = 'entry' | 'history'

export default function TrackingPage() {
  const [tab, setTab] = useState<Tab>('entry')
  return (
    <div>
      <PageHeader
        title="מעקב אימונים"
        subtitle="הזנת האימונים שביצעת במהלך השבוע, וניתוח ההיסטוריה."
      />
      <div className="mb-7">
        <TabBar
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'entry', label: 'הזנה' },
            { value: 'history', label: 'היסטוריה' },
          ]}
        />
      </div>
      {tab === 'entry' ? <EntryTab /> : <HistoryTab />}
    </div>
  )
}
