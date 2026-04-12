import { useState, useEffect } from "react";
import { GameItemIcon } from "@/components/GameItemIcon";
import type { EquippedItem } from "@/lib/wareraApi";

export const PUBLIC_IMAGES_BASE_URL = `${import.meta.env.BASE_URL}images/`;

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
            <span className="text-[10px] text-zinc-400 font-mono font-bold">{value}</span>
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
        <span className="text-[10px] text-zinc-200 font-mono font-bold">{value}</span>
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
    <div className="flex flex-col gap-4 p-4 bg-zinc-900/40 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all group min-w-[240px]">
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

      <div className="flex items-start gap-6 px-1">
        {Object.entries(breakdown).map(([key, value]) => {
          if (value === 0 && key !== "skill") return null;

          const isModifier = ["ammo", "military", "buff", "debuff"].includes(key);
          const showPercent = isPercentage || isModifier;

          return (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">
                {key.replace("_", " ")}
              </span>
              <span
                className={`text-xs font-mono font-bold ${
                  value < 0
                    ? "text-red-400"
                    : key === "ammo" || key === "military" || (key === "buff" && value > 0)
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
