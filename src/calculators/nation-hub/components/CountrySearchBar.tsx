import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Country } from "@/lib/api/warera";

interface Props {
  countries: Country[];                       // full directory
  selected: Country[];                        // already picked, excluded from results
  onAdd: (country: Country) => void;
  placeholder?: string;
  /** Visual size — "lg" used on landing, "sm" on results header */
  size?: "lg" | "sm";
}

const MAX_RESULTS = 10;

/**
 * Big search input that filters countries by name and shows a dropdown.
 * Clicking a result calls onAdd. The component owns its own search-text state.
 */
export function CountrySearchBar({ countries, selected, onAdd, placeholder, size = "lg" }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(() => new Set(selected.map((c) => c._id)), [selected]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return countries
      .filter((c) => !selectedIds.has(c._id) && c.name.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);
  }, [countries, query, selectedIds]);

  // Close dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelect = (c: Country) => {
    onAdd(c);
    setQuery("");
    // Keep dropdown open so users can chain-add multiple countries.
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && matches.length > 0) {
      e.preventDefault();
      handleSelect(matches[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const dims = size === "lg"
    ? { wrap: "h-14", text: "text-base", icon: "w-5 h-5", pad: "pl-12 pr-4" }
    : { wrap: "h-10", text: "text-sm", icon: "w-4 h-4", pad: "pl-10 pr-3" };

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 ${dims.icon}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Search a nation…"}
          className={`w-full ${dims.wrap} ${dims.text} ${dims.pad} bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:bg-zinc-900 outline-none transition-colors`}
        />
      </div>

      {open && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[320px] overflow-y-auto">
          {matches.length > 0 ? (
            matches.map((c) => (
              <button
                key={c._id}
                onClick={() => handleSelect(c)}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                    alt=""
                    className="w-6 h-4 object-cover rounded-sm opacity-90"
                  />
                  <span>{c.name}</span>
                </div>
                <Plus className="w-4 h-4 text-zinc-500" />
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-xs text-zinc-500 text-center">No nations found</div>
          )}
        </div>
      )}
    </div>
  );
}
