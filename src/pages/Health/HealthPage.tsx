import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import TabBar from '../../components/ui/TabBar'
import WeightTab from './WeightTab'
import CheckupsTab from './CheckupsTab'

type Tab = 'weight' | 'checkups'

export default function HealthPage() {
  const [tab, setTab] = useState<Tab>('weight')
  return (
    <div>
      <PageHeader
        title="מעקב בריאות"
        subtitle="מעקב משקל ובדיקות רפואיות במקום אחד."
      />
      <div className="mb-7">
        <TabBar
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'weight', label: 'משקל' },
            { value: 'checkups', label: 'בדיקות' },
          ]}
        />
      </div>
      {tab === 'weight' ? <WeightTab /> : <CheckupsTab />}
    </div>
  )
}
