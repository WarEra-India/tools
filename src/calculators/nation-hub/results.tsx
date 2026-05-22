import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { getAllCountries, type Country } from "@/lib/api/warera";
import { CountryChipList } from "./components/CountryChipList";
import { CountrySearchBar } from "./components/CountrySearchBar";
import { LensTabs } from "./components/LensTabs";
import { LensStack } from "./components/LensStack";
import { buildResultsSearch, useSelectedCountries } from "./state";

/**
 * Results screen. Reads the selected countries from URL ?c=...
 *   1 country  → LensTabs (full deep dive, every lens as a tab)
 *   2+ countries → LensStack (only comparison-capable lenses, stacked)
 */
export default function NationHubResults() {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const { countries, loading, error } = useSelectedCountries();

  // Mounted-fade-in: page starts at opacity 0 and fades in on mount to
  // match the landing-page fade-out animation.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  // For the "Add to compare" popover.
  const [directory, setDirectory] = useState<Country[]>([]);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    if (!adding) return;
    getAllCountries().then((map) => setDirectory(Object.values(map))).catch(() => {});
  }, [adding]);

  const handleAdd = (country: Country) => {
    const next = [...countries, country];
    setSearchParams(new URLSearchParams(buildResultsSearch(next).slice(1)), { replace: false });
    setAdding(false);
  };

  const handleRemove = (id: string) => {
    const next = countries.filter((c) => c._id !== id);
    if (next.length === 0) {
      navigate("/nation-hub");
      return;
    }
    setSearchParams(new URLSearchParams(buildResultsSearch(next).slice(1)), { replace: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
      </div>
    );
  }

  if (error || countries.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-zinc-400">
          {error ?? "No valid nations in URL."}
        </p>
        <Link
          to="/nation-hub"
          className="text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300"
        >
          ← Back to landing
        </Link>
      </div>
    );
  }

  const isCompare = countries.length >= 2;

  return (
    <div
      className={`min-h-screen bg-zinc-950 transition-opacity duration-300 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 pb-16 space-y-6">
        {/* Header: back, selected chips, add-more */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            to="/nation-hub"
            className="p-2 -ml-2 hover:bg-zinc-900 rounded-full transition-colors"
            aria-label="Back to landing"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>

          <div className="flex-1 min-w-0">
            <CountryChipList
              countries={countries}
              onRemove={handleRemove}
              size="sm"
            />
          </div>

          <div className="relative">
            {adding ? (
              <div className="w-72">
                <CountrySearchBar
                  countries={directory}
                  selected={countries}
                  onAdd={handleAdd}
                  size="sm"
                  placeholder="Add another…"
                />
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="h-10 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {isCompare ? "Add nation" : "Add to compare"}
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {isCompare ? (
          <LensStack countries={countries} />
        ) : (
          <LensTabs country={countries[0]} />
        )}
      </div>
    </div>
  );
}
