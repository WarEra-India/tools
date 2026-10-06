import { Building2, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useProfile } from "@/lib/ProfileContext";
import { type LocationBonus, calculateItemBonus, type RegionInfo } from "@/lib/hooks/useLocationBonus";
import { itemName } from "@/lib/items";
import { itemImageUrl } from "@/lib/images";
import type { CompanyInfo } from "@/lib/wareraApi";
import { CountryFlag } from "@/components/CountryFlag";
import { getAllCountries, type Country } from "@/lib/api/warera";
import { useLivePrices, type LivePrices } from "@/lib/hooks/useLivePrices";
import { COIN_ICON } from "../war-room/components";
import { type ProfitRow } from "@/lib/hooks/useGameConfig";

function calcCompanyBonus(company: CompanyInfo, locationBonus: LocationBonus | null): any | null {
  if (!locationBonus) return null;
  const region = locationBonus.regionById[company.region];
  if (!region) return null;
  const specializedItem = locationBonus.countrySpecializedItem[region.countryId] ?? null;
  const industrialism = locationBonus.countryIndustrialism[region.countryId] ?? 0;
  const breakdown = calculateItemBonus(
    company.itemCode,
    region.depositType,
    region.depositBonus,
    region.stratBonus,
    industrialism,
    specializedItem
  );
  return {
    totalBonus: breakdown.bonus,
    depositMatch: breakdown.depositBonus,
    ethics: breakdown.ethicsBonus,
    ethicDepositBonus: breakdown.ethicDepositBonus,
    ethicSpecializationBonus: breakdown.ethicSpecializationBonus,
    industrialism,
    stratBonus: breakdown.strategicBonus,
  };
}

const UPGRADES_CONFIG: Record<string, { productionIncrement: number, maxLevel: number, upgradeBase: number }> = {
  automatedEngine: {
    productionIncrement: 24, maxLevel: 7, upgradeBase: 20,
  },
  storage: {
    productionIncrement: 200, maxLevel: 7, upgradeBase: 10,
  }
}

function getCompanyCalculations(company: CompanyInfo, locationBonus: LocationBonus | null, livePrices: LivePrices | null, profitRows: ProfitRow[]): {
  bonus: number | null;
  depositMatch: number;
  ethics: number;
  industrialism: number;
  stratBonus: number;
  storage: number;
  ae: number;
  aePerHour: string;
  regionInfo: RegionInfo | undefined;
  production: number;
  productionPercentage: number;
  storageLevel: number;
  aeLevel: number;
  workerCount: number;
  aeUpgradeRaw: number | null;
  storageUpgradeRaw: number | null;
  aeUpgradeCost: number | null;
  storageUpgradeCost: number | null;
  profits: number;
  profitsPerHour: number;
} {
  const regionInfo = locationBonus?.regionById[company.region];
  const { totalBonus, depositMatch, ethics, industrialism, stratBonus } = (calcCompanyBonus(company, locationBonus) ?? {});
  const bonus = locationBonus ? totalBonus : null;

  const storageLevel = company.activeUpgradeLevels.storage;
  const aeLevel = company.activeUpgradeLevels.automatedEngine;
  const workerCount = company.workerCount;

  const storage = storageLevel * UPGRADES_CONFIG.storage.productionIncrement;
  const ae = aeLevel * UPGRADES_CONFIG.automatedEngine.productionIncrement;
  const aeWithBonus = ae * (1 + (bonus ?? 0) / 100);
  const aePerHour = (aeWithBonus / 24).toFixed(2);

  const production = company.production;
  const productionPercentage = Number((production / storage * 100).toFixed(2));

  const aeUpgradeRaw = aeLevel < UPGRADES_CONFIG.automatedEngine.maxLevel ? UPGRADES_CONFIG.automatedEngine.upgradeBase * (2 ** (aeLevel - 1)) : null;
  const aeUpgradeCost = aeUpgradeRaw ? Number((aeUpgradeRaw * (livePrices?.prices.steel ?? 0)).toFixed(2)) : null
  const storageUpgradeRaw = storageLevel < UPGRADES_CONFIG.storage.maxLevel ? UPGRADES_CONFIG.storage.upgradeBase * (2 ** (storageLevel - 1)) : null;
  const storageUpgradeCost = storageUpgradeRaw ? Number((storageUpgradeRaw * (livePrices?.prices.steel ?? 0)).toFixed(2)) : null;

  const profitRow = profitRows.find(r => r.item === company.itemCode);
  const baseProfitPerPP = profitRow ? (profitRow.profit / profitRow.pp) : 0;
  const profits = Number((aeWithBonus * baseProfitPerPP).toFixed(2));
  const profitsPerHour = Number((profits / 24).toFixed(2));

  return {
    bonus,
    depositMatch,
    ethics,
    industrialism,
    stratBonus,
    storage,
    ae,
    aePerHour,
    regionInfo,
    production,
    productionPercentage,
    storageLevel,
    aeLevel,
    workerCount,
    aeUpgradeRaw,
    storageUpgradeRaw,
    aeUpgradeCost,
    storageUpgradeCost,
    profits,
    profitsPerHour,
  }
}

const WORKER_ICON = `${import.meta.env.BASE_URL}images/worker.svg`;
const STORAGE_ICON = `${import.meta.env.BASE_URL}images/storage.svg`;
const AUTOMATED_ENGINE_ICON = `${import.meta.env.BASE_URL}images/ae.svg`;
const INCREMENT_ICON = `${import.meta.env.BASE_URL}images/increment.svg`;

interface Props {
  locationBonus: LocationBonus | null;
  profitRows: ProfitRow[];
}

export default function CompaniesWidget({ locationBonus, profitRows }: Props) {
  const { profile } = useProfile();
  const { data: livePrices } = useLivePrices();
  const [open, setOpen] = useState(true);
  const [countries, setCountries] = useState<Record<string, Country>>({});

  useEffect(() => {
    getAllCountries().then(setCountries).catch(() => { });
  }, []);

  const calculatedCompanies = useMemo(() => {
    if (!profile) return [];
    return profile.companies.map((company: CompanyInfo) => ({
      company,
      calcs: getCompanyCalculations(company, locationBonus, livePrices, profitRows)
    }));
  }, [profile, locationBonus, livePrices, profitRows]);

  const totalProfit = useMemo(() => {
    return (calculatedCompanies as any[]).reduce((sum: number, item) => sum + item.calcs.profits, 0);
  }, [calculatedCompanies]);

  if (!profile || profile.companies.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 focus:outline-none"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Building2 className="h-3.5 w-3.5" />
            Companies of
            <img
              src={profile.user.avatarUrl}
              alt={profile.user.username}
              className="h-5 w-5 rounded-full border border-zinc-700 object-cover"
            />
            <span className="text-zinc-300">{profile.user.username}</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500 uppercase tracking-wider font-semibold">Profit</span>
            <div className="flex items-center gap-1 rounded-full bg-emerald-950/30 px-2.5 py-1 text-emerald-400 border border-emerald-900/50">
              <span className="font-bold tabular-nums">{totalProfit.toFixed(2)}</span>
              <img src={COIN_ICON} className="h-3.5 w-3.5" />
              <span className="text-[11px] opacity-70">/ day</span>
            </div>
          </div>
        </div>

        {open && (
          <div className="flex gap-2 flex-col mt-3">
            {calculatedCompanies.map(({ company, calcs }: { company: CompanyInfo, calcs: any }) => {
              const {
                bonus, regionInfo, depositMatch, ethics,
                industrialism, stratBonus, storage, ae, aePerHour,
                production, productionPercentage, aeLevel, storageLevel,
                workerCount, aeUpgradeCost, storageUpgradeCost, aeUpgradeRaw,
                storageUpgradeRaw, profits, profitsPerHour
              } = calcs;

              return (
                <div
                  key={company._id}
                  className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5"
                >
                  {/* Company Info */}
                  <div className="flex items-center gap-2">
                    <img
                      src={itemImageUrl(company.itemCode)}
                      alt={itemName(company.itemCode)}
                      className="h-8 w-8"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-200 truncate">{company.name}</p>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">
                        {regionInfo?.countryId && <CountryFlag countryCode={countries[regionInfo?.countryId]?.code} className="mr-1 rounded-sm h-3 w-3" />}
                        {regionInfo && (
                          <> {regionInfo.name}, {regionInfo.countryName}</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-2">
                    {/* Income Tax badge */}
                    {regionInfo?.incomeTax && regionInfo.incomeTax > 0 && (
                      <span
                        className="shrink-0 rounded-full bg-yellow-900/50 px-2 py-0.5 text-xs text-yellow-400"
                      >
                        {regionInfo.incomeTax}%
                      </span>
                    )}

                    {/* Bonus badge */}
                    {bonus !== null && (
                      <span
                        title={`Deposit: ${depositMatch}%\nStrat: ${stratBonus}%\nEthics: ${ethics}%`}
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${bonus > 0
                          ? "bg-emerald-900/50 text-emerald-400"
                          : "bg-zinc-800 text-zinc-500"
                          }`}
                      >
                        +{bonus}%
                      </span>
                    )}

                    {/* Comapny Levels */}
                    <div className="flex items-center gap-1 text-xs text-zinc-400 outline outline-1 outline-zinc-800 rounded-full px-2 py-0.5">
                      <span className="font-bold">{aeLevel}</span>
                      <img src={AUTOMATED_ENGINE_ICON} alt="Automated Engine" className="h-4 w-4" />
                    </div>

                    <div className="flex items-center gap-1 text-xs text-zinc-400 outline outline-1 outline-zinc-800 rounded-full px-2 py-0.5">
                      <span className="font-bold">{storageLevel}</span>
                      <img src={STORAGE_ICON} alt="Storage" className="h-4 w-4" />
                    </div>

                    {/* Workers */}
                    {!!workerCount && (
                      <div className="flex items-center gap-1 text-xs text-zinc-400 outline outline-1 outline-zinc-800 rounded-full px-2 py-0.5">
                        <span className="font-bold">{workerCount}</span>
                        <img src={WORKER_ICON} alt="PP" className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Production Bar */}
                  <div className="flex items-center gap-2">
                    <div className="rounded-sm w-full h-4 flex items-center justify-center bg-[#1A2126] relative">
                      <div className="rounded-sm h-full absolute left-0 z-0" style={{ width: `${productionPercentage}%`, background: "linear-gradient(45deg,#5E4B23,#806730)" }}></div>
                      <span className="text-center text-xs text-[#E1C997] z-10">{production.toFixed(2)} / {storage}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <img src={INCREMENT_ICON} alt="Automated Engine" className="h-3.5 w-3.5" />
                      <span className="text-center text-xs text-[#E1C997]">{aePerHour}</span>
                    </div>
                  </div>

                  {/* Upgrades */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-zinc-400">Upgrades:</span>
                    {aeUpgradeCost && (
                      <div className="flex items-center gap-1 text-xs text-zinc-400 outline outline-1 outline-zinc-800 rounded-full px-2 py-0.5">
                        <span className="font-bold">{aeLevel + 1}</span>
                        <img src={AUTOMATED_ENGINE_ICON} alt="Automated Engine" className="h-4 w-4" />
                        =
                        <span className="font-bold">{aeUpgradeRaw}</span>
                        <img src={itemImageUrl("steel")} className="h-5 w-5" />
                        =
                        <span className="font-bold">{aeUpgradeCost}</span>
                        <img src={COIN_ICON} className="h-4 w-4" />
                      </div>
                    )}
                    {storageUpgradeCost && (
                      <div className="flex items-center gap-1 text-xs text-zinc-400 outline outline-1 outline-zinc-800 rounded-full px-2 py-0.5">
                        <span className="font-bold">{storageLevel + 1}</span>
                        <img src={STORAGE_ICON} alt="Automated Engine" className="h-4 w-4" />
                        =
                        <span className="font-bold">{storageUpgradeRaw}</span>
                        <img src={itemImageUrl("steel")} className="h-5 w-5" />
                        =
                        <span className="font-bold">{storageUpgradeCost}</span>
                        <img src={COIN_ICON} className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Profits */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-zinc-400">Profits:</span>
                    <div className="flex items-center gap-1 text-xs text-zinc-400 outline outline-1 outline-zinc-800 rounded-full px-2 py-0.5">
                      <span className="font-bold">{profitsPerHour}</span>
                      <img src={COIN_ICON} className="h-4 w-4" />
                      <span>/ hr</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-400 outline outline-1 outline-zinc-800 rounded-full px-2 py-0.5">
                      <span className="font-bold">{profitsPerHour}</span>
                      x
                      <span className="font-bold">24</span>
                      =
                      <span className="font-bold">{profits}</span>
                      <img src={COIN_ICON} className="h-4 w-4" />
                      <span>/ day</span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
