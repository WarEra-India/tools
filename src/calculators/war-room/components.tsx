import { useState, useEffect } from "react";
import { GameItemIcon } from "@/components/GameItemIcon";
import type { EquippedItem } from "@/lib/wareraApi";
import { Plus, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { RARITY_OTHER_NAMES } from "../craft-theory";
import { FOOD_MULTIPLIERS, AMMO_PERCENTAGES, NOT_PERCENTAGE_SKILLS, SIM_MODIFIER_TYPES } from "./constants";

export const PUBLIC_IMAGES_BASE_URL = `${import.meta.env.BASE_URL}images/`;
export const COIN_ICON = `${PUBLIC_IMAGES_BASE_URL}game_coin.svg`;

export const RARITY_MAP: Record<number, string> = Object.keys(RARITY_OTHER_NAMES).reduce((acc, rarity, index) => {
  acc[index + 1] = rarity;
  return acc;
}, {} as Record<number, string>);

export const EquipmentSlot = ({ item }: { item?: EquippedItem }) => {
  if (!item) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      <GameItemIcon itemCode={item.code} className="h-12 w-12 rounded-md" />
      <div className="flex gap-1.5 items-center justify-center">
        {Object.entries(item.skills).map(([key, value]) => (
          <div key={key} className="flex items-center gap-0.5">
            <img
              src={`${PUBLIC_IMAGES_BASE_URL}${key}.svg`}
              alt={key}
              className="h-3 w-3 object-contain"
              title={key}
            />
            <span className="text-[10px] text-zinc-400 font-mono font-bold">{value}{!NOT_PERCENTAGE_SKILLS.includes(key) ? '%' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CountdownTimer = ({ endAt }: { endAt?: string }) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!endAt) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(endAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        return false;
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
        );
        return true;
      }
    };

    updateTimer();
    const interval = setInterval(() => {
      if (!updateTimer()) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [endAt]);

  if (!timeLeft) return null;

  return (
    <div className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-1 rounded-sm shadow-xl">
      {timeLeft}
    </div>
  );
};

export const BuffSlot = ({
  type,
  value,
  endAt,
}: {
  type: "buff" | "debuff";
  value: number;
  endAt?: string;
}) => {
  if (value === 0) return null;
  const isBuff = type === "buff";
  return (
    <div className="flex flex-col items-center gap-1 relative">
      {endAt && <CountdownTimer endAt={endAt} />}
      <div
        className="h-8 w-8 rounded-md flex items-center justify-center p-1"
        style={{
          background: isBuff
            ? "linear-gradient(45deg,#1A4229,#143320)"
            : "linear-gradient(45deg,#4E1919,#3D1313)",
        }}
      >
        <img src={`${PUBLIC_IMAGES_BASE_URL}${type}.svg`} alt={type} className="h-8 w-8" />
      </div>
      <div key={type} className="flex items-center gap-0.5">
        <img
          src={`${PUBLIC_IMAGES_BASE_URL}attack.svg`}
          alt="attack"
          className="h-3 w-3 object-contain"
          title="Attack Multiplier"
        />
        <span className={`text-[10px] text-zinc-400 font-mono font-bold`}>
          {isBuff ? "+" : "-"}{value}%
        </span>
      </div>
    </div>
  );
};

export const SkillSlot = ({ name, level, value }: { name: string; level: number; value: number }) => {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="h-10 w-10 rounded-md bg-zinc-900/50 border border-zinc-800 flex items-center justify-center p-2">
        <img
          src={`${PUBLIC_IMAGES_BASE_URL}${name}.svg`}
          alt={name}
          className="h-full w-full object-contain"
          title={name}
        />
      </div>
      <div className="flex flex-col items-center -space-y-1">
        <span className="text-[9px] text-zinc-500 font-mono">Lv.{level}</span>
        <span className="text-[10px] text-zinc-200 font-mono font-bold">{value}{!NOT_PERCENTAGE_SKILLS.includes(name) ? '%' : ''}</span>
      </div>
    </div>
  );
};
export const StatBreakdown = ({
  label,
  icon,
  total,
  breakdown,
  isPercentage = true,
}: {
  label: string;
  icon: string;
  total: number | string;
  breakdown: Record<string, number>;
  isPercentage?: boolean;
}) => {
  return (
    <div className="flex flex-col gap-4 p-4 bg-zinc-900/40 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all group w-full sm:w-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
          <img src={`${PUBLIC_IMAGES_BASE_URL}${icon}.svg`} alt={icon} className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
            {label}
          </span>
          <span className="text-xl font-black text-white font-mono leading-none mt-0.5">
            {total}
            {isPercentage && typeof total === "number" ? "%" : ""}
          </span>
        </div>
      </div>

      <div className="flex items-start gap-x-6 gap-y-2 px-1 flex-wrap">
        {Object.entries(breakdown).map(([key, value]) => {
          if (value === 0 && key !== "skill") return null;

          const isModifier = ["ammo", "military", "buff", "debuff", "orders"].includes(key);
          const showPercent = isPercentage || isModifier;

          return (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">
                {key.replace("_", " ")}
              </span>
              <span
                className={`text-xs font-mono font-bold ${value < 0
                  ? "text-red-400"
                  : key === "ammo" || key === "military" || key === "orders" || (key === "buff" && value > 0)
                    ? "text-green-500"
                    : value > 0
                      ? "text-zinc-300"
                      : "text-zinc-500"
                  }`}
              >
                {value > 0 ? "+" : ""}
                {value}
                {showPercent ? "%" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const BriefStat = ({
  icon,
  value,
  label,
  isPercentage = true,
}: {
  icon: string;
  value: number | string;
  label?: string;
  isPercentage?: boolean;
}) => {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800/30 rounded-xl border border-zinc-800/50 hover:bg-zinc-800/50 transition-colors group cursor-default"
      title={label}
    >
      <img src={`${PUBLIC_IMAGES_BASE_URL}${icon}.svg`} alt={icon} className="h-4 w-4 object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
      <span className="text-[11px] font-mono font-bold text-zinc-300">
        {value}
        {isPercentage && typeof value === "number" ? "%" : ""}
      </span>
    </div>
  );
};

export const ResourceInput = ({
  icon,
  iconNode,
  label,
  value,
  onDecrease,
  onIncrease,
  formatter,
}: {
  icon: string;
  iconNode?: React.ReactNode;
  label: string;
  value: number | undefined;
  onDecrease: () => void;
  onIncrease: () => void;
  formatter?: (value: number | undefined) => React.ReactNode;
}) => (
  <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 relative group">
    <div className="flex flex-col items-center justify-center p-2 min-h-14 min-w-16 bg-zinc-950 rounded-xl border border-zinc-800 shadow-inner">
      {iconNode ? (
        <div className="mb-0.5">{iconNode}</div>
      ) : (
        <img src={`${PUBLIC_IMAGES_BASE_URL}${icon}.svg`} className="h-6 w-6 mb-1 opacity-80" alt={icon} />
      )}
      <div className="text-[10px] font-black text-white font-mono leading-none">{formatter ? formatter(value) : value}</div>
    </div>
    <div className="flex gap-1">
      <button
        onClick={onDecrease}
        className="h-6 w-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 font-bold transition-colors"
      >
        -
      </button>
      <button
        onClick={onIncrease}
        className="h-6 w-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-orange-500 font-bold transition-colors"
      >
        +
      </button>
    </div>
    <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest absolute -bottom-4">{label}</span>
  </div>
);

export const ModifierToggle = ({
  modifier,
  onChange,
  livePrices,
}: {
  modifier: 'buff' | 'debuff' | 'no buff';
  onChange: (mod: 'buff' | 'debuff' | 'no buff') => void;
  livePrices: any;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] gap-1">
      {SIM_MODIFIER_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={cn(
            "h-12 w-12 rounded-xl transition-all flex items-center justify-center relative group",
            modifier === type
              ? type === 'buff'
                ? 'bg-green-500/20 border border-green-500/30'
                : type === 'debuff'
                  ? 'bg-red-500/20 border border-red-500/30'
                  : 'bg-zinc-800 border border-zinc-700 shadow-lg scale-105'
              : 'opacity-30 grayscale hover:opacity-60 hover:grayscale-0'
          )}
        >
          {type === 'no buff' ? (
            <div className="flex items-center justify-center text-[10px] font-black text-zinc-500 uppercase">No Buff</div>
          ) : (
            <img src={`${PUBLIC_IMAGES_BASE_URL}${type}.svg`} className="h-7 w-7" alt={type} />
          )}

          {modifier === type && (
            <div className={cn(
              "absolute -top-1 -right-1 h-3 w-3 rounded-full border border-white/20",
              type === 'buff' ? 'bg-green-500' : type === 'debuff' ? 'bg-red-500' : 'bg-zinc-400'
            )} />
          )}
        </button>
      ))}
    </div>
    <div className="flex items-center justify-center gap-2">
      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest text-center">Pill</span>
      <div className="flex items-center gap-1">
        <img src={COIN_ICON} className="h-3 w-3" />
        <span className="text-[10px] font-mono font-bold text-zinc-200">{livePrices?.prices?.cocain?.toFixed(2) ?? 0}</span>
      </div>
    </div>
  </div>
);

export const StatRangeInput = ({
  icon,
  min,
  max,
  value,
  onChange,
}: {
  icon: string;
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
}) => {
  return (
    <div className="flex flex-col w-full gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <img src={`${PUBLIC_IMAGES_BASE_URL}${icon}.svg`} className="h-3 w-3 opacity-80 object-contain" alt={icon} title={icon} />
          <span className="text-[10px] font-mono font-bold text-zinc-200 leading-none">{value}</span>
        </div>
        <span className="text-[9px] text-zinc-300 font-mono tracking-tighter leading-none">{min}-{max}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-500 outline-none"
      />
    </div>
  );
};

export const EquipmentSelectorPopover = ({
  slot,
  currentValue,
  isOpen,
  onOpenChange,
  onSelect,
  gameConfig,
  livePrices,
  equipPrices,
}: {
  slot: 'weapon' | 'ammo' | 'helmet' | 'chest' | 'gloves' | 'pants' | 'boots' | 'food';
  currentValue: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (code: string | null) => void;
  gameConfig: any;
  livePrices: any;
  equipPrices: any;
}) => {
  const currentPrice = currentValue ? (['ammo', 'food'].includes(slot) ? livePrices?.prices[currentValue] ?? 0 : equipPrices?.[currentValue] ?? 0) : null;

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 group relative">
          {currentValue ? (
            <>
              <GameItemIcon itemCode={currentValue} className="h-19 w-19 rounded-2xl overflow-hidden" />
              <div
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-lg hover:bg-red-500/20 hover:border-red-500/50 transition-all z-10"
                onClick={(e) => { e.stopPropagation(); onSelect(null); }}
              >
                <X className="h-3 w-3 text-zinc-400 group-hover:text-red-400" />
              </div>
              {currentPrice !== null && currentPrice > 0 && (
                <div className="absolute bottom-0 w-full left-0 flex items-center justify-center gap-1">
                  <img src={COIN_ICON} className="h-3 w-3" alt="coin" />
                  <span className="text-[9px] font-mono font-bold text-zinc-200 truncate">
                    {currentPrice.toFixed(2)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="h-8 w-8 rounded-xl bg-zinc-800/50 flex items-center justify-center group-hover:bg-zinc-800 transition-colors border border-zinc-700/30">
                <Plus className="h-4 w-4 text-zinc-600" />
              </div>
              <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{slot}</span>
            </>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-[340px] p-0 overflow-hidden bg-zinc-900 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Select {slot}</span>
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-zinc-800 rounded-md transition-colors">
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>
        <div className="p-2">
          <div className="grid gap-2 grid-cols-3">
            {(() => {
              let options: { code: string; name: string; subtitle?: string; stats?: any }[] = [];
              if (slot === 'weapon') {
                options = ['knife', 'gun', 'rifle', 'sniper', 'tank', 'jet'].map(code => {
                  const equip = gameConfig?.equipments.find((e: any) => e.code === code);
                  return {
                    code,
                    name: code.charAt(0).toUpperCase() + code.slice(1),
                    stats: equip?.dynamicStats
                  };
                });
              } else if (slot === 'ammo') {
                options = [
                  { code: 'lightAmmo', name: 'Light', subtitle: `+${AMMO_PERCENTAGES.lightAmmo}%` },
                  { code: 'ammo', name: 'Ammo', subtitle: `+${AMMO_PERCENTAGES.ammo}%` },
                  { code: 'heavyAmmo', name: 'Heavy', subtitle: `+${AMMO_PERCENTAGES.heavyAmmo}%` },
                ];
              } else if (slot === 'food') {
                options = [
                  { code: 'bread', name: 'Bread', subtitle: `+${FOOD_MULTIPLIERS.bread * 100}%` },
                  { code: 'steak', name: 'Steak', subtitle: `+${FOOD_MULTIPLIERS.steak * 100}%` },
                  { code: 'cookedFish', name: 'Cooked Fish', subtitle: `+${FOOD_MULTIPLIERS.cookedFish * 100}%` },
                ];
              } else {
                options = [1, 2, 3, 4, 5, 6].map(r => {
                  const code = `${slot}${r}`;
                  const rarity = RARITY_MAP[r];
                  const equip = gameConfig?.equipments.find((e: any) => e.code === code);
                  return {
                    code,
                    name: `${RARITY_OTHER_NAMES[rarity]}`,
                    // subtitle: `Tier ${r}`,
                    stats: equip?.dynamicStats
                  };
                });
              }

              return options.map(opt => {
                const price = ['ammo', 'food'].includes(slot)
                  ? livePrices?.prices[opt.code] ?? 0
                  : equipPrices?.[opt.code] ?? 0;

                return (
                  <button
                    key={opt.code}
                    onClick={() => {
                      onSelect(opt.code);
                      onOpenChange(false);
                    }}
                    className="flex flex-col gap-2 p-2.5 rounded-xl bg-zinc-950/50 hover:bg-zinc-800 transition-all group text-left border border-zinc-800/50 hover:border-zinc-700 h-full"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <GameItemIcon itemCode={opt.code} className="h-10 w-10 rounded-lg " />
                    </div>

                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-white uppercase truncate">
                          {opt.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <img src={COIN_ICON} className="h-2.5 w-2.5" alt="coin" />
                        <span className="text-[10px] font-mono font-bold text-zinc-400">
                          {price.toFixed(2)}
                        </span>
                      </div>
                      {opt.subtitle && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {slot === 'ammo' && <img src={`${PUBLIC_IMAGES_BASE_URL}attack.svg`} className="h-3 w-3 opacity-80" />}
                          {slot === 'food' && <img src={`${PUBLIC_IMAGES_BASE_URL}health.svg`} className="h-3 w-3 opacity-80" />}
                          <span className="text-[10px] font-mono font-bold text-zinc-400">
                            {opt.subtitle}
                          </span>
                        </div>
                      )}
                      {opt.stats && (
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          {Object.entries(opt.stats).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex items-center gap-1">
                              <img
                                src={`${PUBLIC_IMAGES_BASE_URL}${key}.svg`}
                                alt={key}
                                className="h-3 w-3 object-contain"
                              />
                              <span className="text-[10px] font-mono font-bold text-zinc-400">
                                {Array.isArray(value) ? value.join('-') : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
