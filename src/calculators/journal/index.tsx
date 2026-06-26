import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Search, Newspaper, Eye, ThumbsUp, ThumbsDown, Star, MessageSquare, Calendar, Globe, Tag, Users, Coins, Gem, ChevronDown, ExternalLink, Check } from "lucide-react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getUserByIdSuggestion, type UserLiteSuggestion } from "@/lib/wareraApi"
import { DayPicker, type DateRange } from "react-day-picker"
import "react-day-picker/style.css"

interface WarvaultArticle {
  id: string
  title: string
  category: string
  language: string
  author_id: string
  date: string
}

interface ArticleStats {
  likes: number
  dislikes: number
  score: number
  views: number
  comments: number
  subs: number
  tips: number
  gemTips: number
}

interface ArticleDetails {
  _id: string
  title: string
  content: string
  language: string
  category: string
  author: string
  isPublished: boolean
  isDeleted: boolean
  isPublic: boolean
  createdAt: string
  updatedAt: string
  publishedAt: string
  slug: string
  stats: ArticleStats
}

import { LANGUAGES, CATEGORIES } from "./constanst"
import { CountryFlag } from "@/components/CountryFlag"

const WARVAULT_API = "https://warvault.shadoooow.workers.dev/api"
const WARERA_API = "https://api2.warera.io/trpc/article.getArticleById"

const articleCache = new Map<string, { timestamp: number, data: any }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

async function getCachedArticleDetails(articleId: string): Promise<any> {
  const cached = articleCache.get(articleId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const res = await fetch(WARERA_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "*/*" },
    body: JSON.stringify({ articleId })
  })
  const json = await res.json()

  if (json.result?.data) {
    articleCache.set(articleId, { timestamp: Date.now(), data: json.result.data })
    return json.result.data
  }
  throw new Error("No data returned")
}

const authorCache = new Map<string, Promise<UserLiteSuggestion | null>>()

async function getCachedAuthor(userId: string): Promise<UserLiteSuggestion | null> {
  if (!userId) return null
  if (authorCache.has(userId)) return authorCache.get(userId) as Promise<UserLiteSuggestion | null>

  const promise = getUserByIdSuggestion(userId).catch(err => {
    console.error("Failed to fetch author", err)
    return null
  })
  authorCache.set(userId, promise)
  return promise
}

function ArticleCard({ article, onClick }: { article: WarvaultArticle, onClick: () => void }) {
  const [stats, setStats] = useState<ArticleStats | null>(null)
  const [author, setAuthor] = useState<UserLiteSuggestion | null>(null)

  useEffect(() => {
    let isMounted = true

    if (article.author_id) {
      getCachedAuthor(article.author_id).then(user => {
        if (isMounted && user) setAuthor(user)
      })
    }

    const fetchStats = async () => {
      try {
        const data = await getCachedArticleDetails(article.id)
        if (isMounted && data?.stats) {
          setStats(data.stats)
        }
      } catch (err) {
        console.error("Failed to fetch article stats", err)
      }
    }
    fetchStats()
    return () => { isMounted = false }
  }, [article.id])

  return (
    <Card
      className="cursor-pointer hover:border-zinc-700 transition-colors bg-zinc-900/40 group"
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold leading-tight text-zinc-100 mb-3 group-hover:text-emerald-400 transition-colors">
              {article.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              {author && (
                <div className="flex items-center gap-1.5 text-zinc-300 font-medium bg-zinc-800/40 px-2 py-0.5 rounded-full border border-zinc-700/50">
                  <img src={author.avatarUrl} alt={author.username} className="w-4 h-4 rounded-full object-cover" />
                  <span>{author.username}</span>
                </div>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(article.date).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric'
                })}
              </span>
              <Badge variant="outline" className="bg-zinc-800/30 text-zinc-300 border-zinc-700/50 capitalize">
                {article.category}
              </Badge>
              {LANGUAGES[article.language] && (
                <div className="flex items-center gap-1.5 bg-zinc-800/40 px-2 py-0.5 rounded border border-zinc-700/50">
                  <CountryFlag countryCode={LANGUAGES[article.language].flagCode} className="w-3 h-3" />
                  <span className="text-[10px] font-bold tracking-wider text-zinc-300">
                    {LANGUAGES[article.language].code.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats on Card */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-3 border-t border-zinc-800/50">
          {stats ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1 text-zinc-400" title="Views">
                <Eye className="h-3.5 w-3.5" /> {stats.views.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-emerald-400" title="Likes">
                <ThumbsUp className="h-3.5 w-3.5" /> {stats.likes.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-red-400" title="Dislikes">
                <ThumbsDown className="h-3.5 w-3.5" /> {stats.dislikes.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-zinc-400" title="Comments">
                <MessageSquare className="h-3.5 w-3.5" /> {stats.comments.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-amber-400" title="Score">
                <Star className="h-3.5 w-3.5" /> {stats.score.toLocaleString()}
              </div>
              {stats.tips > 0 && (
                <div className="flex items-center gap-1 text-yellow-500" title="Tips">
                  <Coins className="h-3.5 w-3.5" /> {stats.tips.toLocaleString()}
                </div>
              )}
              {stats.gemTips > 0 && (
                <div className="flex items-center gap-1 text-rose-400" title="Gem Tips">
                  <Gem className="h-3.5 w-3.5" /> {stats.gemTips.toLocaleString()}
                </div>
              )}
              {stats.subs > 0 && (
                <div className="flex items-center gap-1 text-blue-400" title="Subscribers">
                  <Users className="h-3.5 w-3.5" /> {stats.subs.toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="h-6.5 w-48 bg-zinc-800/50 rounded animate-pulse" />
          )}

          <div className="ml-auto">
            <a
              href={`https://app.warera.io/article/${article.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-zinc-300 hover:text-white bg-zinc-800 px-2.5 py-1 rounded-md text-xs border border-zinc-700 hover:bg-zinc-700 transition-colors shadow-sm"
              title="Open in WarEra"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  icon: Icon
}: {
  options: { label: string, value: string, icon?: React.ReactNode }[],
  selected: string[],
  onChange: (val: string[]) => void,
  placeholder: string,
  icon: any
}) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelectAll = () => onChange(options.map(o => o.value))
  const handleClearAll = () => onChange([])

  return (
    <div className="relative">
      <div
        className="h-10 w-full sm:w-48 appearance-none rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-10 py-2 text-sm text-zinc-50 focus-within:ring-2 focus-within:ring-emerald-500 transition-colors hover:border-zinc-700 cursor-pointer flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
        <span className="truncate pr-2">
          {selected.length === 0 ? placeholder : selected.length === options.length ? "All Selected" : `${selected.length} Selected`}
        </span>
        <ChevronDown className="h-4 w-4 text-zinc-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[22rem]">
            <div className="flex items-center justify-between p-2 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded hover:bg-emerald-500/10 transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-zinc-400 hover:text-zinc-300 font-medium px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
              >
                Clear All
              </button>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-1">
              {options.map(opt => {
                const isSelected = selected.includes(opt.value)
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/50 rounded cursor-pointer transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700 bg-zinc-950'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    {opt.icon && <div className="shrink-0">{opt.icon}</div>}
                    <span className="text-sm text-zinc-300 truncate">{opt.label}</span>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) onChange([...selected, opt.value])
                        else onChange(selected.filter(v => v !== opt.value))
                      }}
                    />
                  </label>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DateRangeDropdown({
  startDate, endDate, setStartDate, setEndDate
}: {
  startDate: string, endDate: string, setStartDate: (val: string) => void, setEndDate: (val: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>(() => {
    return {
      from: startDate ? new Date(startDate) : undefined,
      to: endDate ? new Date(endDate) : undefined
    }
  })

  useEffect(() => {
    if (isOpen) {
      setRange({
        from: startDate ? new Date(startDate) : undefined,
        to: endDate ? new Date(endDate) : undefined
      })
    }
  }, [isOpen, startDate, endDate])

  const handleApply = () => {
    if (range?.from) {
      const from = new Date(range.from.getTime() - (range.from.getTimezoneOffset() * 60000))
      setStartDate(from.toISOString().split("T")[0])
    } else {
      setStartDate("")
    }

    if (range?.to) {
      const to = new Date(range.to.getTime() - (range.to.getTimezoneOffset() * 60000))
      setEndDate(to.toISOString().split("T")[0])
    } else {
      setEndDate("")
    }
    setIsOpen(false)
  }

  const handleClear = () => {
    setStartDate("")
    setEndDate("")
    setIsOpen(false)
  }

  const applyPreset = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)

    const startStr = start.toISOString().split("T")[0]
    const endStr = end.toISOString().split("T")[0]

    setStartDate(startStr)
    setEndDate(endStr)
    setIsOpen(false)
  }

  const applyAllTime = () => {
    setStartDate("")
    setEndDate("")
    setIsOpen(false)
  }

  const label = startDate || endDate
    ? `${startDate ? new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : 'Start'} - ${endDate ? new Date(endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : 'End'}`
    : "All Time"

  return (
    <div className="relative flex-none">
      <div
        className="h-10 w-full sm:w-60 appearance-none rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-10 py-2 text-sm text-zinc-50 focus-within:ring-2 focus-within:ring-emerald-500 transition-colors hover:border-zinc-700 cursor-pointer flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
        <span className="truncate pr-2 font-medium">{label}</span>
        <ChevronDown className="h-4 w-4 text-zinc-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-[22rem] sm:w-max bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col sm:flex-row">

            {/* Presets Sidebar */}
            <div className="flex flex-row sm:flex-col gap-1 p-3 bg-zinc-900/50 border-b sm:border-b-0 sm:border-r border-zinc-800 sm:w-40 overflow-x-auto sm:overflow-visible shrink-0">
              <button onClick={() => applyPreset(0)} className="text-left px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors whitespace-nowrap">Today</button>
              <button onClick={() => applyPreset(7)} className="text-left px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors whitespace-nowrap">Last 7 Days</button>
              <button onClick={() => applyPreset(30)} className="text-left px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors whitespace-nowrap">Last 30 Days</button>
              <button onClick={applyAllTime} className="text-left px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors whitespace-nowrap">All Time</button>
            </div>

            {/* Custom Range */}
            <div className="p-4 flex-1 flex flex-col gap-4 items-center">
              <DayPicker
                mode="range"
                selected={range}
                onSelect={setRange}
                disabled={[{ before: new Date("2025-05-01") }, { after: new Date() }]}
                className="text-zinc-300 mx-auto"
                showOutsideDays
              />

              <div className="flex gap-2 mt-auto pt-4 w-full">
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-medium transition-colors shadow-lg shadow-emerald-900/20"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function Journal() {
  const [articles, setArticles] = useState<WarvaultArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [search, setSearch] = useState("")
  const [categories, setCategories] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [sort, setSort] = useState("desc")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [offset, setOffset] = useState(0)
  const LIMIT = 20

  // Details
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [articleDetails, setArticleDetails] = useState<ArticleDetails | null>(null)
  const [authorDetails, setAuthorDetails] = useState<UserLiteSuggestion | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const fetchArticles = useCallback(async (reset = false) => {
    setLoading(true)
    try {
      const currentOffset = reset ? 0 : offset
      const queryParams = new URLSearchParams()
      queryParams.set("limit", LIMIT.toString())
      queryParams.set("offset", currentOffset.toString())
      if (search) queryParams.set("search", search)
      if (categories.length > 0) queryParams.set("category", categories.join(","))
      if (languages.length > 0) queryParams.set("language", languages.join(","))
      if (startDate) queryParams.set("startDate", startDate)
      if (endDate) queryParams.set("endDate", endDate)
      if (sort) {
        queryParams.set("order", sort)
        queryParams.set("sort", sort)
      }

      const res = await fetch(`${WARVAULT_API}/articles?${queryParams.toString()}`)
      const data = await res.json()

      if (reset) {
        setArticles(data.items || [])
      } else {
        setArticles(prev => [...prev, ...(data.items || [])])
      }
      setTotalCount(data.totalCount || 0)
      if (reset) setOffset(LIMIT)
      else setOffset(currentOffset + LIMIT)
    } catch (err) {
      console.error("Failed to fetch articles", err)
    } finally {
      setLoading(false)
    }
  }, [search, categories, languages, sort, offset, startDate, endDate])

  // Initial load and filter changes
  useEffect(() => {
    fetchArticles(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, languages, sort, startDate, endDate])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchArticles(true)
  }

  const loadMore = () => {
    if (!loading && articles.length < totalCount) {
      fetchArticles(false)
    }
  }

  // Fetch article details
  useEffect(() => {
    if (!selectedArticleId) {
      setArticleDetails(null)
      setAuthorDetails(null)
      return
    }

    const fetchDetails = async () => {
      setDetailsLoading(true)
      try {
        const data = await getCachedArticleDetails(selectedArticleId)
        if (data) {
          setArticleDetails(data)
          if (data.author) {
            const authorData = await getCachedAuthor(data.author)
            setAuthorDetails(authorData)
          }
        }
      } catch (err) {
        console.error("Failed to fetch article details", err)
      } finally {
        setDetailsLoading(false)
      }
    }

    fetchDetails()
  }, [selectedArticleId])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedArticleId) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [selectedArticleId])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 relative">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calculators
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Newspaper className="h-8 w-8 text-emerald-500" />
            Journal
          </h1>
          <p className="mt-1 text-zinc-400">
            Explore the articles
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col gap-4">
          {/* Row 1: Search */}
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search by Title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 w-full bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500"
            />
          </form>

          {/* Row 2: Dropdowns */}
          <div className="flex flex-col sm:flex-row gap-4">
            <MultiSelectDropdown
              icon={Tag}
              placeholder="All Categories"
              selected={categories}
              onChange={setCategories}
              options={CATEGORIES.map(c => ({ label: c, value: c.toLowerCase() }))}
            />

            <MultiSelectDropdown
              icon={Globe}
              placeholder="All Languages"
              selected={languages}
              onChange={setLanguages}
              options={Object.values(LANGUAGES).map(l => ({
                label: l.label,
                value: l.code,
                icon: <CountryFlag countryCode={l.flagCode} className="w-4 h-3 opacity-90 rounded-[1px]" />
              }))}
            />

            <div className="relative flex-none">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-10 w-full appearance-none rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-10 py-2 text-sm text-zinc-50 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors hover:border-zinc-700"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            </div>

            <DateRangeDropdown
              startDate={startDate}
              endDate={endDate}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
            />
          </div>
        </div>

        {/* Total Count */}
        {!loading && totalCount > 0 && (
          <div className="mb-4 text-sm text-zinc-400">
            Showing <span className="font-medium text-zinc-200">{articles.length}</span> of <span className="font-medium text-zinc-200">{totalCount}</span> articles
          </div>
        )}

        {/* List View */}
        <div className="grid gap-4">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onClick={() => setSelectedArticleId(article.id)}
            />
          ))}

          {articles.length === 0 && loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-500" />
              <p className="mt-4 text-zinc-500 animate-pulse">Loading articles...</p>
            </div>
          )}

          {articles.length === 0 && !loading && (
            <div className="text-center py-12 text-zinc-500">
              No articles found matching your criteria.
            </div>
          )}

          {articles.length < totalCount && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full py-4 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-lg transition-colors flex justify-center items-center"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-800 border-t-emerald-500" />
              ) : (
                "Load More"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Article Detail Overlay */}
      {selectedArticleId && (
        <div className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto custom-scrollbar animate-in fade-in duration-200">
          <div className="container mx-auto max-w-4xl px-4 py-8 min-h-screen flex flex-col">
            <button
              onClick={() => setSelectedArticleId(null)}
              className="sticky top-4 self-start mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-4 py-2 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-800 hover:bg-zinc-800 z-10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </button>

            {detailsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-500" />
                <p className="mt-4 text-zinc-500 animate-pulse">Loading article content...</p>
              </div>
            ) : articleDetails ? (
              <article className="pb-20">
                <header className="mb-8">
                  <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                    {authorDetails && (
                      <div className="flex items-center gap-2 text-zinc-200 font-medium bg-zinc-800/60 px-3 py-1 rounded-full border border-zinc-700/50">
                        <img src={authorDetails.avatarUrl} alt={authorDetails.username} className="w-5 h-5 rounded-full object-cover" />
                        <span>{authorDetails.username}</span>
                      </div>
                    )}
                    <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 capitalize px-3 py-1 text-xs">
                      {articleDetails.category}
                    </Badge>
                    {LANGUAGES[articleDetails.language] && (
                      <div className="flex items-center gap-2 bg-zinc-800/60 px-2.5 py-1 rounded-md border border-zinc-700/50">
                        <CountryFlag countryCode={LANGUAGES[articleDetails.language].flagCode} className="w-4 h-4" />
                        <span className="text-xs font-bold tracking-wider text-zinc-200">
                          {LANGUAGES[articleDetails.language].label}
                        </span>
                      </div>
                    )}
                    <span className="text-zinc-500 flex items-center gap-1.5 ml-auto text-xs font-medium bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/50">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(articleDetails.publishedAt || articleDetails.createdAt).toLocaleString(undefined, {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-6">
                    {articleDetails.title}
                  </h1>

                  <div className="flex flex-wrap gap-3 pt-6 border-t border-zinc-800/50">
                    <div className="flex items-center gap-1.5 text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-md text-sm border border-zinc-800" title="Views">
                      <Eye className="h-4 w-4" />
                      <span>{articleDetails.stats.views.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-md text-sm font-medium border border-emerald-500/20" title="Likes">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{articleDetails.stats.likes.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-red-400 bg-red-500/10 px-3 py-1.5 rounded-md text-sm font-medium border border-red-500/20" title="Dislikes">
                      <ThumbsDown className="h-4 w-4" />
                      <span>{articleDetails.stats.dislikes.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-md text-sm font-medium border border-amber-500/20" title="Score">
                      <Star className="h-4 w-4" />
                      <span>{articleDetails.stats.score.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-md text-sm border border-zinc-800" title="Comments">
                      <MessageSquare className="h-4 w-4" />
                      <span>{articleDetails.stats.comments.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-md text-sm border border-yellow-500/20" title="Tips">
                      <Coins className="h-4 w-4" />
                      <span>{articleDetails.stats.tips.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-md text-sm border border-rose-500/20" title="Gem Tips">
                      <Gem className="h-4 w-4" />
                      <span>{articleDetails.stats.gemTips.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-md text-sm border border-blue-500/20" title="Subscribers">
                      <Users className="h-4 w-4" />
                      <span>{articleDetails.stats.subs.toLocaleString()}</span>
                    </div>

                    <div className="ml-auto flex">
                      <a
                        href={`https://app.warera.io/article/${articleDetails._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-zinc-300 hover:text-white bg-zinc-800 px-3 py-1.5 rounded-md text-sm border border-zinc-700 hover:bg-zinc-700 transition-colors shadow-sm"
                        title="Open in WarEra"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>View in WarEra</span>
                      </a>
                    </div>
                  </div>
                </header>

                <div
                  className="prose prose-invert prose-emerald max-w-none 
                      prose-p:leading-relaxed prose-p:text-zinc-300 prose-p:text-lg
                      prose-a:text-emerald-400 hover:prose-a:text-emerald-300
                      prose-headings:text-zinc-100 prose-strong:text-zinc-200
                      bg-zinc-900/30 p-6 sm:p-10 rounded-2xl border border-zinc-800/50 shadow-xl"
                  dangerouslySetInnerHTML={{ __html: articleDetails.content }}
                />
              </article>
            ) : (
              <div className="py-20 text-center text-red-400">
                Failed to load article details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
