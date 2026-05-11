import { useState, useEffect, useRef } from "react";
import { API_BASE } from "../wareraApi";

const COUNTRIES_URL = API_BASE + "/country.getAllCountries";
const REGIONS_URL = API_BASE + "/region.getRegionsObject";
const PARTY_URL = API_BASE + "/";

/** Maps raw-material deposit type → broad category for ethics bonus */
const DEPOSIT_CATEGORY: Record<string, "agricultural" | "industrial"> = {
  grain: "agricultural",
  livestock: "agricultural",
  fish: "agricultural",
  coca: "agricultural",
  // bread: "agricultural",
  // steak: "agricultural",
  // cookedFish: "agricultural",
  // cocaine: "agricultural",

  limestone: "industrial",
  iron: "industrial",
  lead: "industrial",
  petroleum: "industrial",
  concrete: "industrial",
  steel: "industrial",
  oil: "industrial",
  ammo: "industrial",
  lightAmmo: "industrial",
  heavyAmmo: "industrial",
};

/** Returns the ethics production bonus % for a given deposit type and industrialism value */
export function getEthicsBonus(
  itemCode: string | null,
  industrialism: number,
  specializedItem: string | null = null
): number {
  if (!itemCode) return 0;

  const category = DEPOSIT_CATEGORY[itemCode];
  if (!category) return 0;

  if (industrialism === -2 && category === "agricultural") return 30;

  if (specializedItem && itemCode !== specializedItem) return 0;

  if (industrialism === -1 && category === "agricultural") return 10;
  if (industrialism === 1 && category === "industrial") return 10;
  if (industrialism === 2 && category === "industrial") return 30;
  return 0;
}

/**
 * Calculate Bonus, getRecommendedRegionIds
 */
export function calcBonus(
  depositBonus: number,
  stratBonus: number,
  ethicsBonus: number,
  industrialism: number
): number {
  return stratBonus + Math.max(depositBonus, ethicsBonus);
}

export interface BestLocation {
  bonus: number;
  regionName: string;
  countryName: string;
  depositBonus: number;
  stratBonus: number;
  ethicsBonus: number;
}

export interface RegionInfo {
  name: string;
  countryName: string;
  countryId: string;
  depositType: string | null;
  /** Raw deposit % bonus — only applies to companies whose itemCode matches depositType */
  depositBonus: number;
  /** Country strategic resource bonus — applies to all companies */
  stratBonus: number;
  /** depositBonus + stratBonus (no ethics — ethics is item-specific, computed by the consumer) */
  bonus: number;
  incomeTax: number;
}

export interface LocationBonus {
  /** deposit type (raw material) → best total bonus percent */
  bonusByType: Record<string, number>;
  /** deposit type → best region/country info */
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

        // Build region lookup and find best per deposit type
        const bonusByType: Record<string, number> = {};
        const bestByType: Record<string, BestLocation> = {};
        const regionById: Record<string, RegionInfo> = {};
        for (const r of Object.values(regionsObj)) {
          const country = countries.find(c => c._id === r.country);
          const depositType = r.deposit?.type ?? null;
          const regionBonus = r.deposit?.bonusPercent ?? 0;
          const stratBonus = countryBonus[r.country] ?? 0;
          const industrialism = countryIndustrialism[r.country] ?? 0;

          // regionById: no ethics — ethics depends on the company's item, not the region's deposit
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

          // bestByType: check this region for every possible item type.
          // A region contributes deposit bonus only when its deposit matches the item;
          // ethics bonus applies based on the item's category regardless of the deposit.
          for (const itemCode of Object.keys(DEPOSIT_CATEGORY)) {
            const deposit = depositType === itemCode ? regionBonus : 0;
            const specializedItem = countrySpecializedItem[r.country] ?? null;
            const itemStratBonus = itemCode === specializedItem ? stratBonus : 0;
            const ethicsBonus = getEthicsBonus(itemCode, industrialism, specializedItem);
            const total = calcBonus(deposit, itemStratBonus, ethicsBonus, industrialism);
            if (total > 0 && total > (bonusByType[itemCode] ?? 0)) {
              bonusByType[itemCode] = total;
              bestByType[itemCode] = {
                bonus: total,
                regionName: r.name,
                countryName: countryName[r.country] ?? "Unknown",
                depositBonus: deposit,
                stratBonus: itemStratBonus,
                ethicsBonus,
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
