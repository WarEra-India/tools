import { useMemo, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Receipt, Key, ChevronRight, User } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useProfile } from "@/lib/ProfileContext";
import { useTransactions } from "@/lib/hooks/useTransactions";
import { GameItemIcon } from "@/components/GameItemIcon";
import { HistoryChart } from "@/components/HistoryChart";

const PUBLIC_IMAGES_BASE_URL = `${import.meta.env.BASE_URL}images/`;
const COIN_ICON = `${PUBLIC_IMAGES_BASE_URL}game_coin.svg`;
const BASE_IMAGES_URL = "https://app.warera.io/images/items/";
const API_BASE = "https://warvault.shadoooow.workers.dev/api"

function getCategoryIcon(type: string) {
  if (type == "openCase") return `${BASE_IMAGES_URL}case1.png`;

  // Remove virtual prefix if present
  const baseType = type == "battleLoot" ? "lootChance" : type.split('-')[0];
  return PUBLIC_IMAGES_BASE_URL + baseType + ".svg"
}

// Removed local WealthHistoryChart (now using @/components/HistoryChart)

interface TypeSummary {
  type: string;
  displayType: string;
  totalMoney: number;
  totalScraps: number;
  count: number;

  // Detailed data for expansion
  tradingDetails: Record<string, { quantity: number; money: number }>;
  battleLootDetails: Record<string, number>; // itemCode -> totalQuantity
  wageLaborDetails: Record<string, number>; // sellerId -> totalMoney
  dismantleDetails: Record<string, { quantity: number; scraps: number }>; // sourceCode -> {qty, scraps}
  openCaseDetails: Record<string, { quantity: number; rewards: Record<string, number> }>; // caseCode -> {qty, rewards}
  donationDetails: { country: number; mu: number };
}

export default function PassbookPage() {
  const { profile } = useProfile();
  const userId = profile?.user?._id;
  const { transactions, loading, hasMore, fetchMore, error: fetchError } = useTransactions(userId);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [token, setToken] = useState<string>(localStorage.getItem("warera-api-token") || "");
  const [isEditingToken, setIsEditingToken] = useState(!localStorage.getItem("warera-api-token"));
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

  // Removed local fetch (handled by HistoryChart)

  const saveToken = () => {
    localStorage.setItem("warera-api-token", token);
    setIsEditingToken(false);
    window.location.reload();
  };

  const toggleCard = (id: string, type: string) => {
    if (type === "wage-income") return; // No expand for wage income
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchMore();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, fetchMore]);

  useEffect(() => {
    if (viewMode === "weekly" && transactions.length < 500 && hasMore && !loading) {
      fetchMore();
    }
  }, [viewMode, transactions.length, hasMore, loading, fetchMore]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, {
      totalMoney: number;
      typeSummaries: Record<string, TypeSummary>;
      dailyFlows: Record<string, number>;
    }> = {};

    const getMonday = (d: Date) => {
      const date = new Date(d);
      const day = date.getUTCDay();
      const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
      return new Date(date.setUTCDate(diff));
    };

    transactions.forEach((tx) => {
      const txDate = new Date(tx.createdAt);
      const utcDateStr = txDate.toISOString().split("T")[0];

      let groupKey = utcDateStr;
      if (viewMode === "weekly") {
        groupKey = getMonday(txDate).toISOString().split("T")[0];
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { totalMoney: 0, typeSummaries: {}, dailyFlows: {} };
      }

      let type: string = tx.transactionType;
      let displayType = type.replace(/([A-Z])/g, ' $1').trim();

      if (type === "wage") {
        if (tx.sellerId === userId) {
          type = "wage-income";
          displayType = "Wage (Income)";
        } else if (tx.buyerId === userId) {
          type = "wage-expense";
          displayType = "Wage (Labor)";
        }
      }

      if (!groups[groupKey].typeSummaries[type]) {
        groups[groupKey].typeSummaries[type] = {
          type,
          displayType,
          totalMoney: 0,
          totalScraps: 0,
          count: 0,
          tradingDetails: {},
          battleLootDetails: {},
          wageLaborDetails: {},
          dismantleDetails: {},
          openCaseDetails: {},
          donationDetails: { country: 0, mu: 0 }
        };
      }

      const summary = groups[groupKey].typeSummaries[type];
      summary.count += 1;

      const isBuyer = tx.buyerId === userId;
      const amount = tx.money ? (isBuyer ? -tx.money : tx.money) : 0;

      if (tx.money) {
        summary.totalMoney += amount;
        groups[groupKey].totalMoney += amount;
        groups[groupKey].dailyFlows[utcDateStr] = (groups[groupKey].dailyFlows[utcDateStr] || 0) + amount;
      }

      // Detailed data collection
      if (type === "trading" || type === "itemMarket") {
        const code = tx.itemCode || tx.item?.code || "unknown";
        if (!summary.tradingDetails[code]) {
          summary.tradingDetails[code] = { quantity: 0, money: 0 };
        }
        summary.tradingDetails[code].quantity += (tx.quantity || 1);
        summary.tradingDetails[code].money += amount;
      }

      if (type === "wage-expense" && tx.sellerId) {
        summary.wageLaborDetails[tx.sellerId] = (summary.wageLaborDetails[tx.sellerId] || 0) + Math.abs(amount);
      }

      if (type === "dismantleItem") {
        // subagent finding: source item in item.code, scraps qty in root quantity
        const sourceCode = tx.item?.code || "unknown";
        const sourceQty = tx.item?.quantity || 1;
        const scrapsQty = tx.quantity || 0;

        if (!summary.dismantleDetails[sourceCode]) {
          summary.dismantleDetails[sourceCode] = { quantity: 0, scraps: 0 };
        }
        summary.dismantleDetails[sourceCode].quantity += sourceQty;
        summary.dismantleDetails[sourceCode].scraps += scrapsQty;
        summary.totalScraps += scrapsQty;
      }

      if (type === "battleLoot") {
        const lootCode = tx.itemCode || tx.item?.code || "unknown";
        const lootQty = tx.quantity || tx.item?.quantity || 1;
        summary.battleLootDetails[lootCode] = (summary.battleLootDetails[lootCode] || 0) + lootQty;
      }

      if (type === "openCase") {
        // subagent finding: case in itemCode, reward in item.code, reward qty in item.quantity
        const caseCode = tx.itemCode || "unknown";
        const numCases = tx.quantity || 1;
        const rewardCode = tx.item?.code || "unknown";
        const rewardQty = tx.item?.quantity || 1;

        if (!summary.openCaseDetails[caseCode]) {
          summary.openCaseDetails[caseCode] = { quantity: 0, rewards: {} };
        }
        summary.openCaseDetails[caseCode].quantity += numCases;
        summary.openCaseDetails[caseCode].rewards[rewardCode] = (summary.openCaseDetails[caseCode].rewards[rewardCode] || 0) + rewardQty;
      }

      if (type === "donation") {
        if (tx.sellerCountryId) {
          summary.donationDetails.country += Math.abs(amount);
        } else if (tx.sellerMuId) {
          summary.donationDetails.mu += Math.abs(amount);
        }
      }
    });

    return Object.entries(groups).map(([key, data]) => ({
      date: key,
      totalMoney: data.totalMoney,
      summaries: Object.values(data.typeSummaries),
      dailyFlows: data.dailyFlows,
    }));
  }, [transactions, userId, viewMode]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition-all hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                Passbook Analysis
              </h1>
              <p className="text-zinc-500 mt-1 max-w-lg">
                Deeper financial insights and performance metrics across your entire profile.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/50 shadow-inner">
                <button
                  onClick={() => setViewMode("daily")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === "daily" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-400"}`}
                >
                  DAILY
                </button>
                <button
                  onClick={() => setViewMode("weekly")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === "weekly" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-400"}`}
                >
                  WEEKLY
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEditingToken(true)}
                  className="rounded-full bg-zinc-900 border border-zinc-800 p-2 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-all shadow-inner"
                  title="Update API Token"
                >
                  <Key className="h-4 w-4" />
                </button>
                {profile?.user && (
                  <div className="flex items-center gap-3 rounded-full bg-zinc-900/50 p-1.5 pr-4 border border-zinc-800/50 backdrop-blur-md">
                    <img
                      src={profile.user.avatarUrl}
                      alt={profile.user.username}
                      className="h-8 w-8 rounded-full border border-zinc-700/50 object-cover"
                    />
                    <div>
                      <div className="text-xs font-bold leading-none">{profile.user.username}</div>
                      <div className="text-[9px] text-zinc-600 mt-0.5 uppercase tracking-tighter">Verified User</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {isEditingToken && (
          <Card className="mb-8 border-amber-500/10 bg-amber-500/5 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-500">
            <CardHeader className="pb-3 px-6">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-500 font-black tracking-tight">
                <Key className="h-5 w-5" />
                AUTH REQUIRED
              </CardTitle>
              <CardDescription className="text-amber-500/50">
                Provide your API token to analyze transaction flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="flex gap-2">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your API token here..."
                  className="flex-1 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 py-2.5 text-sm focus:border-amber-500/50 focus:outline-none transition-all placeholder:text-zinc-700"
                />
                <button
                  onClick={saveToken}
                  className="rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-black text-white hover:bg-amber-500 transition-all active:scale-95 shadow-lg shadow-amber-900/20"
                >
                  SYNK
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {(fetchError || (!transactions.length && !loading && !isEditingToken)) ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-500 text-center animate-in fade-in duration-1000">
            <div className="h-20 w-20 rounded-full bg-zinc-900/50 flex items-center justify-center mb-6 border border-zinc-800/50">
              <Receipt className="h-8 w-8 opacity-20" />
            </div>
            <h3 className="text-xl font-bold text-zinc-400">
              {fetchError ? "Access Denied" : "Zero Activity Found"}
            </h3>
            <p className="mt-2 text-sm max-w-[240px] mx-auto text-zinc-600 font-medium">
              {fetchError
                ? "Your API token is rejected by the server."
                : "No transaction events were recorded for this profile."}
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            <div className="animate-in fade-in duration-1000">
              <HistoryChart userId={userId} />
            </div>

            {groupedTransactions.map((group) => (
              <div key={group.date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-row items-end justify-between px-2 mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-1">
                      {viewMode === "daily" ? "Daily Report" : "Weekly Report"}
                    </span>
                    <h2 className="text-3xl font-black font-mono tracking-tighter text-white uppercase italic">
                      {viewMode === "daily" ? (
                        new Date(group.date + "T00:00:00Z").toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          // year: "numeric",
                          timeZone: "UTC"
                        })
                      ) : (
                        (() => {
                          const startDate = new Date(group.date + "T00:00:00Z");
                          const sundayDate = new Date(startDate);
                          sundayDate.setUTCDate(startDate.getUTCDate() + 6);
                          
                          const today = new Date();
                          const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
                          
                          const endDate = sundayDate < todayUTC ? sundayDate : todayUTC;

                          const startStr = startDate.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            timeZone: "UTC"
                          });
                          
                          const endStr = endDate.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            timeZone: "UTC"
                          });

                          return `${startStr} - ${endStr}`;
                        })()
                      )}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Net Flow</span>
                    <div className={`flex items-center gap-1.5 text-2xl font-black font-mono tracking-tighter ${group.totalMoney >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {group.totalMoney > 0 ? "+" : group.totalMoney < 0 ? "-" : ""}
                      {Math.abs(group.totalMoney).toFixed(2)}
                      <img src={COIN_ICON} alt="coins" className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {viewMode === "weekly" && (
                  <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                    {Object.entries(group.dailyFlows)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([date, money]) => (
                        <div key={date} className="bg-zinc-900/40 rounded-2xl border border-zinc-800/30 p-3 backdrop-blur-sm">
                          <div className="text-[9px] font-black text-zinc-600 uppercase tracking-wider mb-2">
                            {new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                          </div>
                          <div className={`text-sm font-black font-mono tracking-tighter ${money >= 0 ? "text-emerald-500/80" : "text-red-500/80"}`}>
                            {money > 0 ? "+" : money < 0 ? "-" : ""}
                            {Math.abs(money).toFixed(1)}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                  {group.summaries.map((summary) => {
                    const cardId = `${group.date}-${summary.type}`;
                    const isExpanded = expandedCards[cardId];
                    const icon = getCategoryIcon(summary.type);
                    const isPositive = summary.totalMoney >= 0;
                    const canExpand = summary.type !== "wage-income";

                    return (
                      <div
                        key={summary.type}
                        className={`flex flex-col h-fit rounded-[24px] transition-all duration-300 backdrop-blur-sm border ${canExpand ? "cursor-pointer" : "cursor-default"
                          } ${isExpanded
                            ? "bg-zinc-900/60 border-zinc-700/50 shadow-2xl scale-[1.02] z-10"
                            : "bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-900/50 hover:border-zinc-700/30"
                          }`}
                        onClick={() => toggleCard(cardId, summary.type)}
                      >
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-inner">
                              {icon ? (
                                <img src={icon} alt={summary.type} className="h-7 w-7 object-contain opacity-80" />
                              ) : (
                                <Receipt className="h-6 w-6 text-zinc-600" />
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-black font-mono text-zinc-500 bg-zinc-950/80 px-2 py-0.5 rounded-lg border border-zinc-800/50">
                                {summary.count} Events
                              </span>
                              {canExpand && (
                                <ChevronRight className={`h-4 w-4 text-zinc-700 transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`} />
                              )}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-1 group-hover:text-zinc-400 transition-colors">
                              {summary.displayType}
                            </h3>
                            {summary.type === "dismantleItem" ? (
                              <div className="text-2xl font-black font-mono tracking-tighter flex items-center gap-1 text-emerald-400">
                                {Math.floor(summary.totalScraps)}
                                <GameItemIcon itemCode="scraps" className="h-5 w-5" />
                              </div>
                            ) : summary.totalMoney !== 0 && (
                              <div className={`text-2xl font-black font-mono tracking-tighter flex items-center gap-1 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                                {summary.totalMoney > 0 ? "+" : "-"}
                                {Math.abs(summary.totalMoney).toFixed(2)}
                                <img src={COIN_ICON} alt="coins" className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-6 pb-6 pt-0 animate-in fade-in duration-300 space-y-4">
                            <div className="border-t border-zinc-800/50 pt-4">
                              {/* Trading / Item Market Breakdown */}
                              {(summary.type === "trading" || summary.type === "itemMarket") && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3">
                                    Detailed Valuations
                                  </div>
                                  {Object.entries(summary.tradingDetails).map(([code, data]) => (
                                    <div key={code} className="flex items-center justify-between text-[11px] font-mono">
                                      <div className="flex items-center gap-2">
                                        <span className={data.money >= 0 ? "text-emerald-500" : "text-red-500"}>
                                          {data.money >= 0 ? "Sell" : "Buy"}
                                        </span>
                                        <span className="text-zinc-400">{data.quantity}x</span>
                                        <GameItemIcon itemCode={code} className="h-5 w-5 rounded-md" />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-zinc-500">=</span>
                                        <span className={data.money >= 0 ? "text-emerald-500" : "text-red-500"}>
                                          {Math.abs(data.money).toFixed(2)}
                                        </span>
                                        <img src={COIN_ICON} alt="coins" className="h-3 w-3" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Battle Loot Breakdown */}
                              {summary.type === "battleLoot" && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3">
                                    Loot Acquired
                                  </div>
                                  {Object.entries(summary.battleLootDetails).map(([code, quantity]) => (
                                    <div key={code} className="flex items-center justify-between text-[11px] font-mono">
                                      <div className="flex items-center gap-2">
                                        <span className="text-emerald-500">Loot</span>
                                        <span className="text-zinc-400">{quantity}x</span>
                                        <GameItemIcon itemCode={code} className="h-5 w-5 rounded-md" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Wage Labor Breakdown */}
                              {summary.type === "wage-expense" && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3">
                                    <User className="h-3 w-3" />
                                    Payroll Recipients
                                  </div>
                                  {Object.entries(summary.wageLaborDetails).map(([sid, money]) => (
                                    <div key={sid} className="flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-zinc-500 truncate max-w-[140px]">{sid}</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-zinc-400">{money.toFixed(2)}</span>
                                        <img src={COIN_ICON} alt="coins" className="h-2.5 w-2.5" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Dismantle Breakdown */}
                              {summary.type === "dismantleItem" && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3">
                                    Conversion Results
                                  </div>
                                  {Object.entries(summary.dismantleDetails).map(([code, data]) => (
                                    <div key={code} className="flex items-center justify-between text-[11px] font-mono">
                                      <div className="flex items-center gap-2">
                                        <span className="text-zinc-400">{data.quantity}x</span>
                                        <GameItemIcon itemCode={code} className="h-5 w-5 rounded-md" />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-zinc-500">=</span>
                                        <span className="text-emerald-500">{data.scraps > 0 ? Math.floor(data.scraps) : "?"}</span>
                                        <GameItemIcon itemCode="scraps" className="h-5 w-5" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Open Case Breakdown */}
                              {summary.type === "openCase" && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3">
                                    Unboxing History
                                  </div>
                                  {Object.entries(summary.openCaseDetails).map(([caseCode, data]) => (
                                    <div key={caseCode} className="space-y-2">
                                      <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                                        <span>{data.quantity}x</span>
                                        <GameItemIcon itemCode={caseCode} className="h-5 w-5" />
                                        <span className="text-zinc-600">:</span>
                                      </div>
                                      <div className="flex flex-wrap gap-2 pl-4">
                                        {Object.entries(data.rewards).map(([rewardCode, qty]) => (
                                          <div key={rewardCode} className="flex items-center gap-1.5 px-1.5 py-0.5">
                                            <span className="text-[10px] font-black text-emerald-500">{qty}x</span>
                                            <GameItemIcon itemCode={rewardCode} className="h-5 w-5 rounded-md" />
                                          </div>
                                        ))}
                                        {Object.keys(data.rewards).length === 0 && (
                                          <span className="text-[10px] text-zinc-700 italic">No reward data preserved</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Donation Breakdown */}
                              {summary.type === "donation" && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3">
                                    Philanthropy Targets
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-zinc-950 border border-zinc-800/50 p-3 rounded-2xl flex flex-col items-center gap-1">
                                      <img src={PUBLIC_IMAGES_BASE_URL + "government.svg"} className="h-4 w-4 text-blue-500 mb-1" />
                                      <span className="text-[10px] font-bold text-zinc-600 uppercase">Country</span>
                                      <div className="flex items-center gap-1 font-mono text-zinc-300">
                                        {summary.donationDetails.country.toFixed(0)}
                                        <img src={COIN_ICON} alt="coins" className="h-2.5 w-2.5" />
                                      </div>
                                    </div>
                                    <div className="bg-zinc-950 border border-zinc-800/50 p-3 rounded-2xl flex flex-col items-center gap-1">
                                      <img src={PUBLIC_IMAGES_BASE_URL + "military.svg"} className="h-4 w-4 text-purple-500 mb-1" />
                                      <span className="text-[10px] font-bold text-zinc-600 uppercase">Military Unit</span>
                                      <div className="flex items-center gap-1 font-mono text-zinc-300">
                                        {summary.donationDetails.mu.toFixed(0)}
                                        <img src={COIN_ICON} alt="coins" className="h-2.5 w-2.5" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={observerTarget} className="mt-24 flex justify-center py-12">
          {loading && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 flex items-center justify-center">
                <div className="absolute h-10 w-10 animate-ping rounded-full border border-emerald-500/20" />
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-emerald-500" />
              </div>
              <p className="text-[10px] text-zinc-600 font-black animate-pulse tracking-[0.4em] uppercase">Deep Scanning</p>
            </div>
          )}
          {!hasMore && transactions.length > 0 && (
            <div className="flex items-center gap-8 opacity-20 group">
              <div className="h-px w-24 bg-gradient-to-l from-zinc-700 to-transparent" />
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400 group-hover:opacity-100 transition-opacity">EndOfReport</p>
              <div className="h-px w-24 bg-gradient-to-r from-zinc-700 to-transparent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
