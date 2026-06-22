import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import TabBar from '../../components/ui/TabBar'
import StrengthProgram from './StrengthProgram'
import AerobicProgram from './AerobicProgram'

type Tab = 'strength' | 'aerobic'

export default function ProgramPage() {
  const [tab, setTab] = useState<Tab>('strength')
  return (
    <div>
      <PageHeader
        title="תוכנית אימונים"
        subtitle="הגדרת אימוני הכוח (סוגים ותרגילים) והיעדים השבועיים לאירובי."
      />
      <div className="mb-7">
        <TabBar
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'strength', label: 'כוח' },
            { value: 'aerobic', label: 'אירובי' },
          ]}
        />
      </div>
      {tab === 'strength' ? <StrengthProgram /> : <AerobicProgram />}
    </div>
  )
}
