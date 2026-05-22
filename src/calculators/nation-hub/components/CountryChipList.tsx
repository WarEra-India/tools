import { X } from "lucide-react";
import type { Country } from "@/lib/api/warera";

interface Props {
  countries: Country[];
  onRemove?: (id: string) => void;
  /** Hides the X button — used on the results header where chips are just a label. */
  readOnly?: boolean;
  /** "lg" used on landing (more breathing room), "sm" on results header */
  size?: "lg" | "sm";
  emptyMessage?: string;
}

/**
 * Pill list of selected countries. Extracted from baby-boom so every screen
 * that shows "selected nations" looks identical.
 */
export function CountryChipList({
  countries,
  onRemove,
  readOnly = false,
  size = "lg",
  emptyMessage,
}: Props) {
  if (countries.length === 0) {
    return emptyMessage ? (
      <p className="text-xs text-zinc-600 italic">{emptyMessage}</p>
    ) : null;
  }

  const dims = size === "lg"
    ? { pad: "pl-2 pr-3 py-1.5", flag: "w-5 h-3.5", text: "text-xs", gap: "gap-2" }
    : { pad: "pl-1.5 pr-2 py-1", flag: "w-4 h-3", text: "text-[10px]", gap: "gap-1.5" };

  return (
    <div className={`flex flex-wrap ${size === "lg" ? "gap-2" : "gap-1.5"}`}>
      {countries.map((c) => (
        <div
          key={c._id}
          className={`flex items-center ${dims.gap} bg-zinc-900 border border-zinc-800 ${dims.pad} rounded-full`}
        >
          <img
            src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
            alt=""
            className={`${dims.flag} object-cover rounded-sm`}
          />
          <span className={`${dims.text} font-bold text-zinc-200 uppercase tracking-wide`}>
            {c.name}
          </span>
          {!readOnly && onRemove && (
            <button
              onClick={() => onRemove(c._id)}
              className="text-zinc-500 hover:text-red-400 transition-colors ml-0.5"
              aria-label={`Remove ${c.name}`}
            >
              <X className={size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3"} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
