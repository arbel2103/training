import AnalysisView from './AnalysisView'
import TrendsView from './TrendsView'
import ListView from './ListView'

/** History as one screen: analysis, then records & trends, then the list. */
export default function HistoryTab() {
  return (
    <div>
      <AnalysisView />
      <div className="mt-10">
        <h2 className="font-display text-xl font-bold mb-4">📈 שיאים ומגמות</h2>
        <TrendsView />
      </div>
      <div className="mt-10">
        <h2 className="font-display text-xl font-bold mb-4">כל האימונים</h2>
        <ListView />
      </div>
    </div>
  )
}
