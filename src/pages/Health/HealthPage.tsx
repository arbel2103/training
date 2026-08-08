import { useEffect, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import TabBar from '../../components/ui/TabBar'
import WeightTab from './WeightTab'
import CheckupsTab from './CheckupsTab'
import SleepTab from './SleepTab'
import DailyHealthTab from './DailyHealthTab'
import { useAppShell, TRI_PAGE } from '../../lib/appShell'

type Tab = 'sleep' | 'daily' | 'weight' | 'checkups'

export default function HealthPage() {
  const [tab, setTab] = useState<Tab>('sleep')
  const appNav = useAppShell((s) => s.appNav)

  // honor shortcut requests that target a specific Health sub-tab
  useEffect(() => {
    if (appNav?.app === 'tri' && appNav.page === TRI_PAGE.health && appNav.tab) {
      setTab(appNav.tab as Tab)
    }
  }, [appNav])
  return (
    <div>
      <PageHeader
        title="מעקב בריאות"
        subtitle="שינה, בריאות יומית, משקל ובדיקות — במקום אחד."
      />
      <div className="mb-7 overflow-x-auto no-scrollbar">
        <TabBar
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'sleep', label: 'שינה' },
            { value: 'daily', label: 'בריאות יומית' },
            { value: 'weight', label: 'משקל' },
            { value: 'checkups', label: 'בדיקות' },
          ]}
        />
      </div>
      {tab === 'sleep' && <SleepTab />}
      {tab === 'daily' && <DailyHealthTab />}
      {tab === 'weight' && <WeightTab />}
      {tab === 'checkups' && <CheckupsTab />}
    </div>
  )
}
