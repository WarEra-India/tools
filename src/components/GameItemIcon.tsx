import { PUBLIC_IMAGES_BASE_URL } from "@/calculators/war-room/components";
import { monthUnique } from "@/lib/images";
import { ITEM_NAMES } from "@/lib/items";
import { type ReactNode } from "react";

const BASE_IMAGES_URL = "https://app.warera.io/images/items/";

export const RARITY_COLORS: Record<string, { color: string; bg: string, color2?: string, bg2?: string }> = {
  common: {
    color: "#546A78",
    bg: "linear-gradient(45deg,#252E35,#101417)",
    color2: "#BBC8D0",
    bg2: "linear-gradient(45deg,#3A4953,#4E6471)"
  },
  uncommon: {
    color: "#82D8A2",
    bg: "linear-gradient(45deg,#143320,#09160E)",
    color2: "#8ADBA8",
    bg2: "linear-gradient(45deg,#1F5132,#2B6E44)"
  },
  rare: {
    color: "#2B50A1",
    bg: "linear-gradient(45deg,#132347,#080F1E)",
    color2: "#9EB7EE",
    bg2: "linear-gradient(45deg,#1D376F,#284B97)"
  },
  epic: {
    color: "#634294",
    bg: "linear-gradient(45deg,#2B1D41,#130C1C)",
    color2: "#CBBAE5",
    bg2: "linear-gradient(45deg,#442E66,#5D3E8B)"
  },
  legendary: {
    color: "#E1C997",
    bg: "linear-gradient(45deg, #3C3016, #1A150A)",
    color2: "#E1C997",
    bg2: "linear-gradient(45deg,#5E4B23,#806730)"
  },
  mythic: {
    color: "#E68989",
    bg: "linear-gradient(45deg,#3E1212,#1B0808)",
    color2: "#E69494",
    bg2: "linear-gradient(45deg,#601E1E,#832929)"
  }
};

interface GameItemIconProps {
  itemCode?: string;
  rarity?: string;
  className?: string;
  health?: number;
  children?: ReactNode;
}

const WEAPON_ORDER = ["knife", "gun", "rifle", "sniper", "tank", "jet"];

const CASE_MAPPING: Record<string, string> = {
  case1: "legendary",
  case2: "mythic",
};

export function GameItemIcon({ itemCode, rarity: rarityOverride, className = "h-5 w-5 rounded-sm", health, children }: GameItemIconProps) {
  let rarity = rarityOverride;
  let baseCode = itemCode;

  if (itemCode) {
    if (ITEM_NAMES[itemCode]) {
      rarity = ITEM_NAMES[itemCode].rarity;
      baseCode = itemCode;
    } else if (CASE_MAPPING[itemCode]) {
      rarity = CASE_MAPPING[itemCode];
      baseCode = itemCode;
    } else if (WEAPON_ORDER.includes(itemCode)) {
      const idx = WEAPON_ORDER.indexOf(itemCode);
      const mapping = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
      rarity = mapping[idx];
      baseCode = itemCode;
    } else {
      const lastChar = itemCode.slice(-1);
      const rarityLevel = parseInt(lastChar);

      if (!isNaN(rarityLevel) && rarityLevel >= 1 && rarityLevel <= 6) {
        baseCode = itemCode.slice(0, -1);
        if (!rarity) {
          const mapping = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
          rarity = mapping[rarityLevel - 1];
        }
      } else if (isNaN(rarityLevel)) {
        // If it's just "boots" or similar without a number, default to rarity 1
        if (!rarity) {
          rarity = "common";
        }
      }
    }
  }

  const colors = rarity ? RARITY_COLORS[rarity] : null;
  const showHealth = health != null && health > 0 && health <= 100;

  const BASE_IMAGE = (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={colors ? { background: colors.bg } : {}}
    >
      {baseCode && (
        <img
          src={`${BASE_IMAGES_URL}${baseCode}.png?v=${monthUnique()}`}
          alt={itemCode || "item"}
          className="h-full w-full object-contain"
        />
      )}
      {children}
    </div>
  );

  if (!showHealth) {
    return BASE_IMAGE;
  }

  return (
    <div
      className="flex flex-col rounded-md"
      style={colors ? { background: colors.bg } : {}}
    >
      {BASE_IMAGE}
      {showHealth && (
        <div className="h-4 w-full relative rounded-b-md overflow-hidden">
          <div className="flex items-center justify-center">
            {health <= 20 && (
              <img src={`${PUBLIC_IMAGES_BASE_URL}warning.svg`} alt="warning" className="h-2 w-2 object-contain" />
            )}
            <span className="text-[10px] font-bold flex items-center justify-center text-center z-10" style={{ color: health <= 20 ? "#E7B098" : colors?.color2 }}> {health}%</span>
          </div>
          <div
            className="h-full absolute top-0 left-0"
            style={{
              width: `${health}%`,
              background: health > 20 ? colors?.bg2 : "linear-gradient(45deg,#673621,#8D492D)"
            }}
          />
        </div>
      )}
    </div>
  );
}
