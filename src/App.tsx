import { HashRouter, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TrackingPage from './pages/Tracking/TrackingPage'
import ProgramPage from './pages/Program/ProgramPage'
import PlanningPage from './pages/Planning/PlanningPage'

export default function App() {
  return (
    <HashRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0 px-6 md:px-10 py-8">
          <div className="max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<TrackingPage />} />
              <Route path="/program" element={<ProgramPage />} />
              <Route path="/planning" element={<PlanningPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  )
}
