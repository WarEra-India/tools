import { Building2, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useProfile } from "@/lib/ProfileContext";
import { type LocationBonus, getEthicsBonus, calcBonus, type RegionInfo } from "@/lib/hooks/useLocationBonus";
import { itemName } from "@/lib/items";
import { itemImageUrl } from "@/lib/images";
import type { CompanyInfo } from "@/lib/wareraApi";
import { CountryFlag } from "@/components/CountryFlag";
import { getAllCountries, type Country } from "@/lib/api/warera";
import { useLivePrices } from "@/lib/hooks/useLivePrices";
import { COIN_ICON } from "../war-room/components";

function calcCompanyBonus(company: CompanyInfo, locationBonus: LocationBonus | null): any | null {
  if (!locationBonus) return null;
  const region = locationBonus.regionById[company.region];
  if (!region) return null;
  const specializedItem = locationBonus.countrySpecializedItem[region.countryId] ?? null;
  const itemStratBonus = company.itemCode === specializedItem ? region.stratBonus : 0;
  const industrialism = locationBonus.countryIndustrialism[region.countryId] ?? 0;
  const depositMatch = region.depositType === company.itemCode ? region.depositBonus : 0;
  const ethics = getEthicsBonus(
    company.itemCode,
    industrialism,
    specializedItem
  );
  return {
    totalBonus: calcBonus(depositMatch, itemStratBonus, ethics, industrialism),
    depositMatch,
    ethics,
    industrialism,
    stratBonus: itemStratBonus,
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

function getCompanyCalculations(company: CompanyInfo, locationBonus: LocationBonus | null): {
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
  aeUpgradeCost: number | null;
  storageUpgradeCost: number | null;
} {
  const regionInfo = locationBonus?.regionById[company.region];
  const { totalBonus, depositMatch, ethics, industrialism, stratBonus } = (calcCompanyBonus(company, locationBonus) ?? {});
  const bonus = locationBonus ? totalBonus : null;

  const storageLevel = company.activeUpgradeLevels.storage;
  const aeLevel = company.activeUpgradeLevels.automatedEngine;
  const workerCount = company.workerCount;

  const storage = storageLevel * UPGRADES_CONFIG.storage.productionIncrement;
  const ae = aeLevel * UPGRADES_CONFIG.automatedEngine.productionIncrement;
  const aePerHour = ((ae / 24) * (1 + (bonus ?? 0) / 100)).toFixed(2);

  const production = company.production;
  const productionPercentage = Number((production / storage * 100).toFixed(2));

  const aeUpgradeCost = aeLevel < UPGRADES_CONFIG.automatedEngine.maxLevel ? UPGRADES_CONFIG.automatedEngine.upgradeBase * (2 ** (aeLevel - 1)) : null;
  const storageUpgradeCost = storageLevel < UPGRADES_CONFIG.storage.maxLevel ? UPGRADES_CONFIG.storage.upgradeBase * (2 ** (storageLevel - 1)) : null;

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
    aeUpgradeCost,
    storageUpgradeCost,
  }
}

const WORKER_ICON = `${import.meta.env.BASE_URL}images/worker.svg`;
const STORAGE_ICON = `${import.meta.env.BASE_URL}images/storage.svg`;
const AUTOMATED_ENGINE_ICON = `${import.meta.env.BASE_URL}images/ae.svg`;
const INCREMENT_ICON = `${import.meta.env.BASE_URL}images/increment.svg`;

interface Props {
  locationBonus: LocationBonus | null;
}

export default function CompaniesWidget({ locationBonus }: Props) {
  const { profile } = useProfile();
  const { data: livePrices } = useLivePrices();
  const [open, setOpen] = useState(true);
  const [countries, setCountries] = useState<Record<string, Country>>({});

  useEffect(() => {
    getAllCountries().then(setCountries).catch(() => { });
  }, []);

  if (!profile || profile.companies.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        <button
          className={'flex items-center gap-2 ' + (open ? 'mb-3' : '') + ' text-xs font-semibold uppercase tracking-wider text-zinc-500 w-full focus:outline-none'}
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

        {open && (
          <div className="flex gap-2 flex-col">
            {profile.companies.map((company) => {
              const {
                bonus, regionInfo, depositMatch, ethics,
                industrialism, stratBonus, storage, ae, aePerHour,
                production, productionPercentage, aeLevel, storageLevel,
                workerCount, aeUpgradeCost, storageUpgradeCost
              } = getCompanyCalculations(company, locationBonus);

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
                        Tax: {regionInfo.incomeTax}%
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
                        Bonus: +{bonus}%
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Upgrades:</span>
                    {aeUpgradeCost && (
                      <div className="flex items-center gap-1 text-xs text-zinc-400 outline outline-1 outline-zinc-800 rounded-full px-2 py-0.5">
                        <span className="font-bold">{aeLevel + 1}</span>
                        <img src={AUTOMATED_ENGINE_ICON} alt="Automated Engine" className="h-4 w-4" />
                        =
                        <span className="font-bold">{aeUpgradeCost}</span>
                        <img src={itemImageUrl("steel")} className="h-5 w-5" />
                        =
                        <span className="font-bold">{(aeUpgradeCost * (livePrices?.prices.steel ?? 0)).toFixed(2)}</span>
                        <img src={COIN_ICON} className="h-4 w-4" />
                      </div>
                    )}
                    {storageUpgradeCost && (
                      <div className="flex items-center gap-1 text-xs text-zinc-400 outline outline-1 outline-zinc-800 rounded-full px-2 py-0.5">
                        <span className="font-bold">{storageLevel + 1}</span>
                        <img src={STORAGE_ICON} alt="Automated Engine" className="h-4 w-4" />
                        =
                        <span className="font-bold">{storageUpgradeCost}</span>
                        <img src={itemImageUrl("steel")} className="h-5 w-5" />
                        =
                        <span className="font-bold">{(storageUpgradeCost * (livePrices?.prices.steel ?? 0)).toFixed(2)}</span>
                        <img src={COIN_ICON} className="h-4 w-4" />
                      </div>
                    )}
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
