import { type ReactNode } from "react";

const BASE_IMAGES_URL = "https://app.warera.io/images/items/";

export const RARITY_COLORS: Record<string, { color: string; bg: string }> = {
  common: {
    color: "#546A78",
    bg: "linear-gradient(45deg,#252E35,#101417)",
  },
  uncommon: {
    color: "#82D8A2",
    bg: "linear-gradient(45deg,#143320,#09160E)",
  },
  rare: {
    color: "#2B50A1",
    bg: "linear-gradient(45deg,#132347,#080F1E)",
  },
  epic: {
    color: "#634294",
    bg: "linear-gradient(45deg,#2B1D41,#130C1C)",
  },
  legendary: {
    color: "#E1C997",
    bg: "linear-gradient(45deg, #3C3016, #1A150A)",
  },
  mythic: {
    color: "#E68989",
    bg: "linear-gradient(45deg,#3E1212,#1B0808)",
  }
};

interface GameItemIconProps {
  itemCode?: string;
  rarity?: string;
  className?: string;
  children?: ReactNode;
}

export function GameItemIcon({ itemCode, rarity: rarityOverride, className = "h-5 w-5 rounded-sm", children }: GameItemIconProps) {
  // Handle specific resources first if itemCode is provided
  if (itemCode === "scraps") return <img src={`${BASE_IMAGES_URL}scraps.png`} alt="scraps" className={className} />;
  if (itemCode === "steel") return <img src={`${BASE_IMAGES_URL}steel.png`} alt="steel" className={className} />;
  if (itemCode === "case1") return <img src={`${BASE_IMAGES_URL}case1.png`} alt="case" className={className} />;
  if (itemCode === "case2") return <img src={`${BASE_IMAGES_URL}case2.png`} alt="case" className={className} />;

  let rarity = rarityOverride;
  let baseCode = itemCode;

  if (itemCode) {
    const WEAPON_ORDER = ["knife", "gun", "rifle", "sniper", "tank", "jet"];
    const AMMO_MAPPING: Record<string, string> = {
      lightAmmo: "uncommon",
      ammo: "rare",
      heavyAmmo: "epic",
    };

    if (AMMO_MAPPING[itemCode]) {
      rarity = AMMO_MAPPING[itemCode];
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

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={colors ? { background: colors.bg } : {}}
    >
      {baseCode && (
        <img
          src={`${BASE_IMAGES_URL}${baseCode}.png?v=1234`}
          alt={itemCode || "item"}
          className="h-full w-full object-contain"
        />
      )}
      {children}
    </div>
  );
}
