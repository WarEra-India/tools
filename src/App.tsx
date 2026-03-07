import { Suspense } from "react"
import { HashRouter, Routes, Route } from "react-router-dom"
import HomePage from "@/pages/HomePage"
import { calculators } from "@/calculators"
import { ProfileProvider } from "@/lib/ProfileContext"

function App() {
  return (
    <ProfileProvider>
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
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
