import AnalysisView from './AnalysisView'
import ListView from './ListView'

/** History as one screen: period analysis on top, the full list below. */
export default function HistoryTab() {
  return (
    <div>
      <AnalysisView />
      <div className="mt-10">
        <h2 className="font-display text-xl font-bold mb-4">כל האימונים</h2>
        <ListView />
      </div>
    </div>
  )
}
