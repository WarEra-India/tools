import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getTopOrders, getItemPrices, getEvents, getAllCountries, type Country } from "@/lib/api/warera"
import { ITEM_NAMES, itemName } from "@/lib/items"
import { itemImageUrl } from "@/lib/images"
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { CountryFlag } from "@/components/CountryFlag"

const ALL_ITEM_CODES = Object.keys(ITEM_NAMES)

export default function MarketTracker() {
  const [loading, setLoading] = useState(true)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [warEvents, setWarEvents] = useState<any[]>([])
  const [countries, setCountries] = useState<Record<string, Country>>({})
  
  const [selectedItem, setSelectedItem] = useState<string>("ammo")
  const [orders, setOrders] = useState<{buyOrders: any[], sellOrders: any[]}>({buyOrders: [], sellOrders: []})
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true)
        const [priceData, events, cmap] = await Promise.all([
          getItemPrices(),
          getEvents(),
          getAllCountries()
        ])
        setPrices(priceData || {})
        setCountries(cmap)
        
        const recentWars = events.filter(e => 
            e.type === "warDeclared" && 
            (Date.now() - new Date(e.createdAt).getTime() < 24 * 60 * 60 * 1000)
        )
        setWarEvents(recentWars)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadInitial()
  }, [])

  useEffect(() => {
      async function loadOrders() {
          if (!selectedItem) return
          try {
              setLoadingOrders(true)
              const data = await getTopOrders(selectedItem)
              setOrders(data || {buyOrders: [], sellOrders: []})
          } catch (err) {
              console.error(err)
          } finally {
              setLoadingOrders(false)
          }
      }
      loadOrders()
  }, [selectedItem])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-4" />
        <p className="text-zinc-400">Loading market data...</p>
      </div>
    )
  }

  const sellOrders = orders.sellOrders || []
  const buyOrders = orders.buyOrders || []

  const avgSellPrice = sellOrders.length > 0 
    ? sellOrders.reduce((acc, o) => acc + o.price, 0) / sellOrders.length
    : 0

  const currentPrice = prices[selectedItem] || 0
  
  const priceDelta = currentPrice > 0 && avgSellPrice > 0 
    ? ((currentPrice - avgSellPrice) / avgSellPrice) * 100 
    : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Market Tracker</h1>
        <p className="text-zinc-400">Analyze real trade prices vs listed prices to find market manipulation and war spikes.</p>
      </div>

      {warEvents.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                  <h3 className="text-red-400 font-bold flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      {warEvents.length} New War(s) Declared
                  </h3>
                  <p className="text-sm text-red-400/80 mt-1">Weapon and food prices may spike. Check listed prices against recent averages below.</p>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        
        {/* Left Col: All items with images (like Company Production) */}
        <div>
            <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
                <CardHeader>
                    <CardTitle>All Items</CardTitle>
                    <CardDescription>Select an item to view its order book</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1.5">
                        {ALL_ITEM_CODES.map((code, index) => {
                            const price = prices[code] || 0
                            return (
                                <button 
                                    key={code}
                                    onClick={() => setSelectedItem(code)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                                      selectedItem === code 
                                        ? 'bg-zinc-800 border-zinc-600' 
                                        : `${index % 2 === 0 ? '' : 'bg-zinc-900/30'} border-transparent hover:border-zinc-700`
                                    }`}
                                >
                                    <img
                                      src={itemImageUrl(code)}
                                      alt={itemName(code)}
                                      className="h-6 w-6 object-contain"
                                      onError={(e) => { e.currentTarget.style.display = "none" }}
                                    />
                                    <span className="flex-1 truncate text-sm text-left text-zinc-200">{itemName(code)}</span>
                                    <span className="tabular-nums text-sm text-zinc-400">{price.toFixed(4)}</span>
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Right Col: Deep Dive */}
        <div className="space-y-6">
            <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                        <img
                          src={itemImageUrl(selectedItem)}
                          alt={itemName(selectedItem)}
                          className="h-8 w-8 object-contain"
                          onError={(e) => { e.currentTarget.style.display = "none" }}
                        />
                        <div>
                            <CardTitle className="text-2xl">{itemName(selectedItem)}</CardTitle>
                            <CardDescription>Order Book &amp; Price Analysis</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 mb-8">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
                            <p className="text-sm font-medium text-zinc-500 mb-1">Market Price</p>
                            <p className="text-2xl font-mono text-white">{currentPrice.toFixed(4)}</p>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
                            <p className="text-sm font-medium text-zinc-500 mb-1">Avg Top 10 Listings</p>
                            <p className="text-2xl font-mono text-zinc-400">{avgSellPrice > 0 ? avgSellPrice.toFixed(4) : "0.0000"}</p>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center">
                            <p className="text-sm font-medium text-zinc-500 mb-1">Spread Volatility</p>
                            <div className="flex items-center gap-2">
                                {priceDelta > 2 ? <TrendingUp className="text-green-500 h-5 w-5" /> : 
                                 priceDelta < -2 ? <TrendingDown className="text-red-500 h-5 w-5" /> : 
                                 <Minus className="text-zinc-500 h-5 w-5" />}
                                <span className={`text-lg font-bold ${priceDelta > 2 ? 'text-green-500' : priceDelta < -2 ? 'text-red-500' : 'text-zinc-500'}`}>
                                    {priceDelta > 0 ? '+' : ''}{priceDelta.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {loadingOrders ? (
                        <div className="py-8 text-center text-zinc-500 flex justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[300px]">
                            <div className="overflow-y-auto pr-2 custom-scrollbar">
                                <h4 className="text-sm font-medium text-red-400 mb-3 border-b border-zinc-800 pb-2 sticky top-0 bg-zinc-950/90 py-1">Sell Orders</h4>
                                <div className="space-y-2">
                                    {sellOrders.map((tx, i) => {
                                        const c = countries[tx.country];
                                        return (
                                        <div key={i} className="flex justify-between items-center bg-red-900/10 border border-red-900/30 p-2 rounded text-sm">
                                            <span className="flex items-center gap-2 max-w-[50%]">
                                                <CountryFlag countryCode={c?.code} className="w-4 h-3" />
                                                <span className="font-mono text-zinc-300 truncate">{tx.quantity}x</span>
                                            </span>
                                            <span className="font-mono font-bold text-red-400">{tx.price.toFixed(4)}</span>
                                        </div>
                                    )})}
                                    {sellOrders.length === 0 && <p className="text-zinc-500 text-sm">No sell orders.</p>}
                                </div>
                            </div>
                            <div className="overflow-y-auto pr-2 custom-scrollbar">
                                <h4 className="text-sm font-medium text-green-400 mb-3 border-b border-zinc-800 pb-2 sticky top-0 bg-zinc-950/90 py-1">Buy Orders</h4>
                                <div className="space-y-2">
                                    {buyOrders.map((tx, i) => {
                                        const c = countries[tx.country];
                                        return (
                                        <div key={i} className="flex justify-between items-center bg-green-900/10 border border-green-900/30 p-2 rounded text-sm">
                                            <span className="font-mono font-bold text-green-400">{tx.price.toFixed(4)}</span>
                                            <span className="flex items-center gap-2 max-w-[50%] justify-end">
                                                <span className="font-mono text-zinc-300 truncate">{tx.quantity}x</span>
                                                <CountryFlag countryCode={c?.code} className="w-4 h-3" />
                                            </span>
                                        </div>
                                    )})}
                                    {buyOrders.length === 0 && <p className="text-zinc-500 text-sm">No buy orders.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  )
}
