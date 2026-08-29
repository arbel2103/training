import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import TabBar from '../../components/ui/TabBar'
import StrengthProgram from './StrengthProgram'
import AerobicProgram from './AerobicProgram'
import GearTab from './GearTab'

type Tab = 'aerobic' | 'strength' | 'gear'

export default function ProgramPage() {
  const [tab, setTab] = useState<Tab>('aerobic')
  return (
    <div>
      <PageHeader
        title="תוכנית אימונים"
        subtitle="הגדרת אימוני הכוח (סוגים ותרגילים), היעדים השבועיים לאירובי, ומעקב שחיקת ציוד."
      />
      <div className="mb-7">
        <TabBar
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'aerobic', label: 'אירובי' },
            { value: 'strength', label: 'כוח' },
            { value: 'gear', label: 'ציוד' },
          ]}
        />
      </div>
      {tab === 'aerobic' && <AerobicProgram />}
      {tab === 'strength' && <StrengthProgram />}
      {tab === 'gear' && <GearTab />}
    </div>
  )
}
