import { Suspense } from "react"
import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import HomePage from "@/pages/HomePage"
import PassbookPage from "@/pages/PassbookPage"
import { calculators } from "@/calculators"
import { ProfileProvider } from "@/lib/ProfileContext"

// Old standalone routes that are now lenses inside Nation Intelligence Hub.
// Preserve deep links by redirecting to the hub landing — users can re-pick
// their country and continue to the same lens via tabs.
const LEGACY_REDIRECTS: string[] = [
  "/baby-boom",
  "/land-area",
  "/national-records",
  "/nation-power",
  "/archetype-analysis",
  "/industrial-atlas",
]

function App() {
  return (
    <ProfileProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/passbook"
            element={
              <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                <PassbookPage />
              </Suspense>
            }
          />
          {LEGACY_REDIRECTS.map((path) => (
            <Route key={path} path={path} element={<Navigate to="/nation-hub" replace />} />
          ))}
          {calculators.map((calc) => (
            <Route
              key={calc.path}
              path={calc.path}
              element={
                <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                  <calc.component />
                </Suspense>
              }
            />
          ))}
        </Routes>
      </HashRouter>
    </ProfileProvider>
  )
}

export default App
