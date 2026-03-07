import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// const PRICES_API_URL = "https://api5.warera.io/trpc/itemTrading.getPrices"
// let cached: { prices: Record<string, number>; timestamp: number } | null = null
// const CACHE_TTL = 30_000

export default defineConfig(() => {
  return {
    base: "/warera-calculators/",
    plugins: [
      react(),
      tailwindcss(),
      // {
      //   name: "api-prices-dev",
      //   configureServer(server) {
      //     server.middlewares.use("/api/prices", async (_req, res) => {
      //       res.setHeader("Content-Type", "application/json")

      //       const now = Date.now()
      //       if (cached && now - cached.timestamp < CACHE_TTL) {
      //         console.log(`[prices] serving cached (age ${((now - cached.timestamp) / 1000).toFixed(1)}s)`)
      //         res.end(JSON.stringify(cached))
      //         return
      //       }

      //       console.log("[prices] cache miss, fetching from upstream...")

      //       try {
      //         const r = await fetch(PRICES_API_URL, {
      //           method: "POST",
      //           headers: { "Content-Type": "application/json" },
      //           body: "{}",
      //         })
      //         if (!r.ok) throw new Error(`API ${r.status}`)
      //         const json = await r.json() as { result?: { data?: Record<string, number> } }
      //         const prices = json?.result?.data
      //         if (!prices || typeof prices !== "object") throw new Error("Unexpected API shape")

      //         console.log(`[prices] fetched ${Object.keys(prices).length} items`)
      //         cached = { prices, timestamp: now }
      //         res.end(JSON.stringify(cached))
      //       } catch (e: any) {
      //         console.error("[prices] fetch error:", e)
      //         if (cached) {
      //           res.end(JSON.stringify(cached))
      //         } else {
      //           res.statusCode = 502
      //           res.end(JSON.stringify({ error: e.message }))
      //         }
      //       }
      //     })
      //   },
      // },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
