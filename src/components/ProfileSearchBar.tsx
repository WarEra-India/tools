import { useState, useEffect, useRef, type FormEvent } from "react";
import { Search } from "lucide-react";
import { useProfile } from "@/lib/ProfileContext";
import { searchUsers, getUserLiteSuggestion, type UserLiteSuggestion } from "@/lib/wareraApi";

export default function ProfileSearchBar() {
  const { loading, error, loadProfile } = useProfile();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UserLiteSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setSuggestionsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const ids = await searchUsers(trimmed, 5);
        const profiles = await Promise.all(ids.map(getUserLiteSuggestion));
        setSuggestions(profiles);
        setShowDropdown(profiles.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (username: string) => {
    setShowDropdown(false);
    setQuery("");
    setSuggestions([]);
    loadProfile(username);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      setShowDropdown(false);
      setSuggestions([]);
      loadProfile(trimmed);
      setQuery("");
    }
  };

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              placeholder="Search your Warera username…"
              className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-3 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="h-9 rounded-md bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load"}
          </button>
        </form>

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 shadow-xl">
            {suggestionsLoading && (
              <div className="px-3 py-2 text-xs text-zinc-500 animate-pulse">Searching…</div>
            )}
            {suggestions.map((s) => (
              <button
                key={s._id}
                type="button"
                onClick={() => handleSelect(s.username)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-zinc-800"
              >
                <img
                  src={s.avatarUrl}
                  alt={s.username}
                  className="h-7 w-7 rounded-full border border-zinc-700 object-cover"
                />
                <span className="flex-1 text-sm font-medium text-zinc-200 truncate">
                  {s.username}
                </span>
                <span className="text-xs text-zinc-500">Lv.{s.level}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </>
  );
}
