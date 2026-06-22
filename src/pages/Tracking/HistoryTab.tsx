import { useState } from 'react'
import TabBar from '../../components/ui/TabBar'
import AnalysisView from './AnalysisView'
import ListView from './ListView'

type Sub = 'analysis' | 'list'

export default function HistoryTab() {
  const [sub, setSub] = useState<Sub>('analysis')
  return (
    <div>
      <div className="mb-6">
        <TabBar
          variant="pill"
          value={sub}
          onChange={setSub}
          tabs={[
            { value: 'analysis', label: 'ניתוח' },
            { value: 'list', label: 'רשימה' },
          ]}
        />
      </div>
      {sub === 'analysis' ? <AnalysisView /> : <ListView />}
    </div>
  )
}
