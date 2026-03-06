import { BrowserRouter, Routes, Route } from "react-router-dom"
import HomePage from "@/pages/HomePage"
import CompanyProductionProfit from "@/pages/CompanyProductionProfit"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/company-production-profit"
          element={<CompanyProductionProfit />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
