import { useMemo, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Receipt, Key, Package, Info, ChevronRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useProfile } from "@/lib/ProfileContext";
import { useTransactions } from "@/lib/hooks/useTransactions";

const PUBLIC_IMAGES_BASE_URL = `${import.meta.env.BASE_URL}images/`;
const COIN_ICON = `${PUBLIC_IMAGES_BASE_URL}game_coin.svg`;
const BASE_IMAGES_URL = "https://app.warera.io/images/items/";
const SCRAPS_ICON = `${BASE_IMAGES_URL}scraps.png`;
const CASE1_ICON = `${BASE_IMAGES_URL}case1.png`;
const CASE2_ICON = `${BASE_IMAGES_URL}case2.png`;

const TRANSACTION_ICONS: Record<string, string> = {
  trading: `${PUBLIC_IMAGES_BASE_URL}trading.svg`,
  itemMarket: `${PUBLIC_IMAGES_BASE_URL}itemMarket.svg`,
  wage: `${PUBLIC_IMAGES_BASE_URL}wage.svg`,
  donation: `${PUBLIC_IMAGES_BASE_URL}donation.svg`,
  articleTip: `${PUBLIC_IMAGES_BASE_URL}articleTip.svg`,
  craftItem: `${PUBLIC_IMAGES_BASE_URL}craftItem.svg`,
  dismantleItem: `${PUBLIC_IMAGES_BASE_URL}dismantleItem.svg`,
  applicationFee: `${PUBLIC_IMAGES_BASE_URL}wage.svg`, // Fallback
};

function getTransactionIcon(type: string, itemCode?: string) {
  if (type === "openCase") {
    return itemCode === "case2" ? CASE2_ICON : CASE1_ICON;
  }
  if (type === "dismantleItem") {
    return SCRAPS_ICON;
  }
  // Remove virtual prefix if present
  const baseType = type.split('-')[0];
  return TRANSACTION_ICONS[baseType] || null;
}

interface TypeSummary {
  type: string; // Internal key, e.g., 'wage-income'
  displayType: string; // e.g., 'Wage (Income)'
  totalMoney: number;
  count: number;
  items: Record<string, number>; // itemCode -> quantity
}

export default function PassbookPage() {
  const { profile } = useProfile();
  const userId = profile?.user?._id;
  const { transactions, loading, hasMore, fetchMore, error: fetchError } = useTransactions(userId);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [token, setToken] = useState<string>(localStorage.getItem("warera-api-token") || "");
  const [isEditingToken, setIsEditingToken] = useState(!localStorage.getItem("warera-api-token"));
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const saveToken = () => {
    localStorage.setItem("warera-api-token", token);
    setIsEditingToken(false);
    window.location.reload();
  };

  const toggleCard = (id: string) => {
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

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, { totalMoney: number; typeSummaries: Record<string, TypeSummary> }> = {};

    transactions.forEach((tx) => {
      const date = new Date(tx.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!groups[date]) {
        groups[date] = { totalMoney: 0, typeSummaries: {} };
      }

      let type = tx.transactionType;
      let displayType = type.replace(/([A-Z])/g, ' $1').trim();

      // Differentiate wages
      if (type === "wage") {
        if (tx.sellerId === userId) {
          type = "wage-income";
          displayType = "Wage (Income)";
        } else if (tx.buyerId === userId) {
          type = "wage-expense";
          displayType = "Wage (Labor)";
        }
      }

      if (!groups[date].typeSummaries[type]) {
        groups[date].typeSummaries[type] = { type, displayType, totalMoney: 0, count: 0, items: {} };
      }

      const summary = groups[date].typeSummaries[type];
      summary.count += 1;

      if (tx.money) {
        const isBuyer = tx.buyerId === userId;
        const amount = isBuyer ? -tx.money : tx.money;
        summary.totalMoney += amount;
        groups[date].totalMoney += amount;
      }

      if (tx.itemCode && tx.quantity) {
        summary.items[tx.itemCode] = (summary.items[tx.itemCode] || 0) + tx.quantity;
      } else if (tx.item?.code) {
        summary.items[tx.item.code] = (summary.items[tx.item.code] || 0) + (tx.quantity || 1);
      }
    });

    return Object.entries(groups).map(([date, data]) => ({
      date,
      totalMoney: data.totalMoney,
      summaries: Object.values(data.typeSummaries),
    }));
  }, [transactions, userId]);

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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditingToken(true)}
                className="rounded-full bg-zinc-900 border border-zinc-800 p-2 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-all shadow-inner"
                title="Update API Token"
              >
                <Key className="h-4 w-4" />
              </button>
              {profile && (
                <div className="flex items-center gap-3 rounded-full bg-zinc-900/50 p-1.5 pr-4 border border-zinc-800/50 backdrop-blur-md">
                  <img
                    src={profile.user.avatarUrl}
                    alt={profile.user.username}
                    className="h-8 w-8 rounded-full border border-zinc-700/50 object-cover"
                  />
                  <div>
                    <div className="text-xs font-bold leading-none">{profile.user.username}</div>
                    <div className="text-[9px] text-zinc-200 mt-0.5 tracking-tighter">Level {profile.user.leveling.level}</div>
                  </div>
                </div>
              )}
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
            {groupedTransactions.map((group) => (
              <div key={group.date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-row items-end justify-between px-2 mb-6">
                  <div className="flex flex-col gap-1">
                    {/* <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                      {group.date}
                    </span> */}
                    <h2 className="text-3xl font-black font-mono tracking-tighter text-white uppercase italic">
                      {group.date}
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.summaries.map((summary) => {
                    const cardId = `${group.date}-${summary.type}`;
                    const isExpanded = expandedCards[cardId];
                    const icon = getTransactionIcon(summary.type);
                    const isPositive = summary.totalMoney >= 0;

                    return (
                      <div
                        key={summary.type}
                        className={`flex flex-col rounded-[24px] transition-all duration-300 backdrop-blur-sm cursor-pointer border ${isExpanded
                          ? "bg-zinc-900/60 border-zinc-700/50 shadow-2xl scale-[1.02] z-10"
                          : "bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-900/50 hover:border-zinc-700/30"
                          }`}
                        onClick={() => toggleCard(cardId)}
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
                              <ChevronRight className={`h-4 w-4 text-zinc-700 transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`} />
                            </div>
                          </div>

                          <div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-1 group-hover:text-zinc-400 transition-colors">
                              {summary.displayType}
                            </h3>
                            {summary.totalMoney !== 0 && (
                              <div className={`flex items-center gap-1.5 text-2xl font-black font-mono tracking-tighter ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                                {summary.totalMoney > 0 ? "+" : "-"}
                                {Math.abs(summary.totalMoney).toFixed(2)}
                                <img src={COIN_ICON} alt="coins" className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-6 pb-6 pt-0 animate-in fade-in duration-300">
                            {Object.keys(summary.items).length > 0 && (
                              <div className="mt-2 border-t border-zinc-800/50 pt-4">
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3">
                                  <Package className="h-3.5 w-3.5" />
                                  Aggregated Yield
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(summary.items).map(([code, qty]) => (
                                    <div key={code} className="bg-zinc-950 border border-zinc-800/50 rounded-xl px-2 py-1 flex items-center gap-2">
                                      <span className="text-[10px] font-black text-emerald-500">{qty}x</span>
                                      <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[80px]">{code}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-zinc-600 uppercase border-t border-zinc-800/50 pt-4">
                              <Info className="h-3 w-3" />
                              Calculated weighted average
                            </div> */}
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
