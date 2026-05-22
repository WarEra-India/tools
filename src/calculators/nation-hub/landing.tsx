import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Globe } from "lucide-react";
import { getAllCountries, type Country } from "@/lib/api/warera";
import { useProfile } from "@/lib/ProfileContext";
import { CountrySearchBar } from "./components/CountrySearchBar";
import { CountryChipList } from "./components/CountryChipList";
import { AnalyzeButton } from "./components/AnalyzeButton";
import { buildResultsSearch } from "./state";

/**
 * Landing screen. Single job: collect a non-empty set of countries, then
 * navigate to /nation-hub?c=us,in,de which triggers the results view.
 */
export default function NationHubLanding() {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const [directory, setDirectory] = useState<Country[]>([]);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Country[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const [pageFade, setPageFade] = useState(false);

  // Auto-seed runs at most once per mount — if the user removes the chip we
  // don't want to keep re-adding it on every render.
  const seededRef = useRef(false);

  useEffect(() => {
    getAllCountries()
      .then((map) => setDirectory(Object.values(map)))
      .catch((err) => setDirectoryError(err?.message ?? "Failed to load countries"));
  }, []);

  // Auto-add the signed-in user's country once both the profile and the
  // directory are available. Only fires while `selected` is empty, so a
  // page navigation back to landing with chips already in URL would skip.
  useEffect(() => {
    if (seededRef.current) return;
    if (directory.length === 0) return;
    const countryId = profile?.user?.country;
    if (!countryId) return;
    const match = directory.find((c) => c._id === countryId);
    if (!match) return;
    seededRef.current = true;
    setSelected((prev) => (prev.length === 0 ? [match] : prev));
  }, [directory, profile]);

  const addCountry = (country: Country) => {
    setSelected((prev) => (prev.find((c) => c._id === country._id) ? prev : [...prev, country]));
  };

  const removeCountry = (id: string) => {
    setSelected((prev) => prev.filter((c) => c._id !== id));
  };

  const handleAnalyze = () => {
    if (selected.length === 0) return;
    setTransitioning(true);
    // Two-stage animation: button morphs to progress bar (~400ms),
    // then page fades and navigates.
    setTimeout(() => setPageFade(true), 350);
    setTimeout(() => {
      navigate(`/nation-hub${buildResultsSearch(selected)}`);
    }, 650);
  };

  return (
    <div
      className={`min-h-screen bg-zinc-950 transition-opacity duration-300 ${
        pageFade ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-8 pb-16">
        {/* Top bar */}
        <div className="flex items-center gap-4 mb-12">
          <Link
            to="/"
            className="p-2 -ml-2 hover:bg-zinc-900 rounded-full transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-black uppercase tracking-widest text-zinc-300">
              Nation Intelligence Hub
            </span>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Pick nations to analyze
          </h1>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            One nation opens a full deep-dive across six lenses.
            Multiple nations side-by-side comparison.
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <CountrySearchBar
            countries={directory}
            selected={selected}
            onAdd={addCountry}
            size="lg"
          />
          {directoryError && (
            <p className="mt-2 text-xs text-red-400">{directoryError}</p>
          )}
        </div>

        {/* Chips */}
        <div className="min-h-[44px] mb-10">
          <CountryChipList
            countries={selected}
            onRemove={removeCountry}
            size="lg"
            emptyMessage="No nations yet — search above to add."
          />
        </div>

        {/* Analyze button */}
        <AnalyzeButton
          count={selected.length}
          onClick={handleAnalyze}
          transitioning={transitioning}
        />
      </div>
    </div>
  );
}
