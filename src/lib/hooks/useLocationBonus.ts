import { useState, useEffect, useRef } from "react";
import { API_BASE } from "../wareraApi";

const COUNTRIES_URL = API_BASE + "/country.getAllCountries";
const REGIONS_URL = API_BASE + "/region.getRegionsObject";
const PARTY_URL = API_BASE + "/";

export const AGRICULTURAL_DEPOSITS = new Set([
  "grain",
  "livestock",
  "fish",
  "coca",
]);

export const INDUSTRIAL_ITEMS = new Set([
  "limestone",
  "iron",
  "lead",
  "petroleum",
  "concrete",
  "steel",
  "oil",
  "ammo",
  "lightAmmo",
  "heavyAmmo",
  "paper",
]);

export const AGRICULTURAL_ITEMS = new Set([
  "grain",
  "livestock",
  "fish",
  "coca",
  "bread",
  "steak",
  "cookedFish",
  "cocain",
]);

export const ALL_PRODUCIBLE_ITEMS = [
  "ammo",
  "bread",
  "coca",
  "cocain",
  "concrete",
  "cookedFish",
  "fish",
  "grain",
  "heavyAmmo",
  "iron",
  "lead",
  "lightAmmo",
  "limestone",
  "livestock",
  "oil",
  "paper",
  "petroleum",
  "steak",
  "steel",
  "wood",
] as const;

export interface ItemBonusBreakdown {
  bonus: number;
  depositBonus: number;
  ethicDepositBonus: number;
  strategicBonus: number;
  ethicSpecializationBonus: number;
  ethicsBonus: number;
}

/**
 * Calculates the exact bonus breakdown for an item in a region/country
 * based on deposit, country specialization, and ruling party ethics.
 */
export function calculateItemBonus(
  itemCode: string,
  regionDepositType: string | null,
  regionDepositBonus: number,
  countryStratBonus: number,
  countryIndustrialism: number,
  countrySpecializedItem: string | null
): ItemBonusBreakdown {
  // 1. Raw deposit bonus (only applies if region deposit matches item)
  const depositBonus = regionDepositType === itemCode ? regionDepositBonus : 0;

  // 2. Ethic deposit bonus (only applies to agricultural deposits when region has matching deposit)
  let ethicDepositBonus = 0;
  if (depositBonus > 0 && AGRICULTURAL_DEPOSITS.has(itemCode)) {
    if (countryIndustrialism === -2) {
      ethicDepositBonus = 30;
    } else if (countryIndustrialism === -1) {
      ethicDepositBonus = 10;
    }
  }

  // 3. Strategic bonus (applies if country specializes in this item)
  const isSpecialized = countrySpecializedItem === itemCode;
  const strategicBonus = isSpecialized ? countryStratBonus : 0;

  // 4. Ethic specialization bonus (applies if country specializes in this item)
  let ethicSpecializationBonus = 0;
  if (isSpecialized) {
    if (INDUSTRIAL_ITEMS.has(itemCode)) {
      if (countryIndustrialism === 2) {
        ethicSpecializationBonus = 30;
      } else if (countryIndustrialism === 1) {
        ethicSpecializationBonus = 10;
      }
    } else if (AGRICULTURAL_ITEMS.has(itemCode)) {
      if (countryIndustrialism === -2) {
        ethicSpecializationBonus = 30;
      } else if (countryIndustrialism === -1) {
        ethicSpecializationBonus = 10;
      }
    }
  }

  const bonus =
    depositBonus + ethicDepositBonus + strategicBonus + ethicSpecializationBonus;

  return {
    bonus,
    depositBonus,
    ethicDepositBonus,
    strategicBonus,
    ethicSpecializationBonus,
    ethicsBonus: ethicDepositBonus + ethicSpecializationBonus,
  };
}

/** Returns the ethics production bonus % for an item */
export function getEthicsBonus(
  itemCode: string | null,
  industrialism: number,
  specializedItem: string | null = null,
  hasDeposit: boolean = false
): number {
  if (!itemCode) return 0;
  const res = calculateItemBonus(
    itemCode,
    hasDeposit ? itemCode : null,
    hasDeposit ? 1 : 0,
    0,
    industrialism,
    specializedItem
  );
  return res.ethicsBonus;
}

/**
 * Calculates total bonus from deposit, strategic, and ethics components
 */
export function calcBonus(
  depositBonus: number,
  stratBonus: number,
  ethicsBonus: number,
  _industrialism?: number
): number {
  return depositBonus + stratBonus + ethicsBonus;
}

export interface BestLocation {
  bonus: number;
  regionId?: string;
  regionName: string;
  countryName: string;
  countryId?: string;
  depositBonus: number;
  ethicDepositBonus: number;
  stratBonus: number;
  ethicSpecializationBonus: number;
  ethicsBonus: number;
  incomeTax?: number;
}

export interface RegionInfo {
  name: string;
  countryName: string;
  countryId: string;
  depositType: string | null;
  /** Raw deposit % bonus — only applies to companies whose itemCode matches depositType */
  depositBonus: number;
  /** Country strategic resource bonus */
  stratBonus: number;
  bonus: number;
  incomeTax: number;
}

export interface LocationBonus {
  /** deposit type (raw material) / item code → best total bonus percent */
  bonusByType: Record<string, number>;
  /** deposit type / item code → best region/country info */
  bestByType: Record<string, BestLocation>;
  /** region ID → region info (for looking up a company's current region) */
  regionById: Record<string, RegionInfo>;
  /** country ID → ruling party industrialism value (for ethics bonus lookup) */
  countryIndustrialism: Record<string, number>;
  /** country ID → specialized item (for ethics bonus lookup) */
  countrySpecializedItem: Record<string, string | null>;
}

interface CountryData {
  _id: string;
  name: string;
  rulingParty?: string | null;
  strategicResources?: {
    bonuses?: {
      productionPercent?: number;
    };
  };
  specializedItem?: string | null;
  taxes: {
    income: number;
    market: number;
    selfWork: number;
  };
}

interface RegionData {
  _id: string;
  name: string;
  country: string;
  deposit?: {
    type: string;
    bonusPercent: number;
  } | null;
}

export function useLocationBonus() {
  const [data, setData] = useState<LocationBonus | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchData() {
      try {
        const [countriesRes, regionsRes] = await Promise.all([
          fetch(COUNTRIES_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }),
          fetch(REGIONS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }),
        ]);

        if (!countriesRes.ok || !regionsRes.ok) throw new Error("API error");

        const countriesJson = await countriesRes.json();
        const regionsJson = await regionsRes.json();

        const countries: CountryData[] = countriesJson?.result?.data ?? [];
        const regionsObj: Record<string, RegionData> =
          regionsJson?.result?.data ?? {};

        // Get parties data
        const countriesWithRulingParty = countries.filter(c => c.rulingParty);
        const partyById: Record<string, any> = {};
        const partyChunkSize = 50;

        for (let i = 0; i < countriesWithRulingParty.length; i += partyChunkSize) {
          const chunk = countriesWithRulingParty.slice(i, i + partyChunkSize);
          const rulingParties: Record<string, { partyId: string }> = {};
          let customPartyUrl = PARTY_URL;
          
          chunk.forEach((c, index) => {
            rulingParties[index] = { partyId: c.rulingParty! };
            customPartyUrl += "party.getById,";
          });
          
          customPartyUrl = customPartyUrl.slice(0, -1) + "?batch=1";
          
          const partiesRes = await fetch(customPartyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rulingParties),
          });
          
          if (!partiesRes.ok) throw new Error("API error fetching parties");
          const partiesJson = await partiesRes.json();

          for (const p of partiesJson ?? []) {
            if (p.result?.data?._id) {
              partyById[p.result.data._id] = p.result.data.ethics ?? {};
            }
          }
        }

        // Build country ID → strategic production bonus, name, and ruling party ethics
        const countryBonus: Record<string, number> = {};
        const countryName: Record<string, string> = {};
        const countryIndustrialism: Record<string, number> = {};
        const countrySpecializedItem: Record<string, string | null> = {};
        for (const c of countries) {
          countryBonus[c._id] =
            c.strategicResources?.bonuses?.productionPercent ?? 0;
          countryName[c._id] = c.name;
          countrySpecializedItem[c._id] = c.specializedItem ?? null;
          if (c.rulingParty && partyById[c.rulingParty]) {
            countryIndustrialism[c._id] =
              partyById[c.rulingParty].industrialism ?? 0;
          }
        }

        // Build region lookup and find best per item type
        const bonusByType: Record<string, number> = {};
        const bestByType: Record<string, BestLocation> = {};
        const regionById: Record<string, RegionInfo> = {};
        for (const r of Object.values(regionsObj)) {
          const country = countries.find(c => c._id === r.country);
          const depositType = r.deposit?.type ?? null;
          const regionBonus = r.deposit?.bonusPercent ?? 0;
          const stratBonus = countryBonus[r.country] ?? 0;
          const industrialism = countryIndustrialism[r.country] ?? 0;
          const specializedItem = countrySpecializedItem[r.country] ?? null;

          regionById[r._id] = {
            name: r.name,
            countryName: countryName[r.country] ?? "Unknown",
            countryId: r.country,
            depositType,
            depositBonus: regionBonus,
            stratBonus,
            bonus: regionBonus + stratBonus,
            incomeTax: country?.taxes.income ?? 0,
          };

          // check this region for every producible item
          for (const itemCode of ALL_PRODUCIBLE_ITEMS) {
            const breakdown = calculateItemBonus(
              itemCode,
              depositType,
              regionBonus,
              stratBonus,
              industrialism,
              specializedItem
            );
            const total = breakdown.bonus;
            const existingBest = bestByType[itemCode];
            const tax = country?.taxes.income ?? 0;

            const isBetter =
              total > (bonusByType[itemCode] ?? 0) ||
              (total > 0 &&
                total === (bonusByType[itemCode] ?? 0) &&
                existingBest &&
                (existingBest.incomeTax ?? 100) > tax);

            if (isBetter || (!existingBest && total > 0)) {
              bonusByType[itemCode] = total;
              bestByType[itemCode] = {
                bonus: total,
                regionId: r._id,
                regionName: r.name,
                countryName: countryName[r.country] ?? "Unknown",
                countryId: r.country,
                depositBonus: breakdown.depositBonus,
                ethicDepositBonus: breakdown.ethicDepositBonus,
                stratBonus: breakdown.strategicBonus,
                ethicSpecializationBonus: breakdown.ethicSpecializationBonus,
                ethicsBonus: breakdown.ethicsBonus,
                incomeTax: tax,
              };
            }
          }
        }

        if (mountedRef.current) {
          setData({ bonusByType, bestByType, regionById, countryIndustrialism, countrySpecializedItem });
        }
      } catch (e) {
        console.error("Failed to fetch location bonus data:", e);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { data, loading };
}

