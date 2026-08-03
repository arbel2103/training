import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import TabBar from '../../components/ui/TabBar'
import StrengthProgram from './StrengthProgram'
import AerobicProgram from './AerobicProgram'

type Tab = 'aerobic' | 'strength'

export default function ProgramPage() {
  const [tab, setTab] = useState<Tab>('aerobic')
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
            { value: 'aerobic', label: 'אירובי' },
            { value: 'strength', label: 'כוח' },
          ]}
        />
      </div>
      {tab === 'aerobic' ? <AerobicProgram /> : <StrengthProgram />}
    </div>
  )
}
