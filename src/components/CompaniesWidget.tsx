import { Building2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useProfile } from "@/lib/ProfileContext";
import { type LocationBonus, getEthicsBonus, calcBonus } from "@/lib/useLocationBonus";
import { itemName } from "@/lib/items";
import { itemImageUrl } from "@/lib/images";
import type { CompanyInfo } from "@/lib/wareraApi";

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

const WORKER_ICON = `${import.meta.env.BASE_URL}images/worker.svg`;
const STORAGE_ICON = `${import.meta.env.BASE_URL}images/storage.svg`;
const AUTOMATED_ENGINE_ICON = `${import.meta.env.BASE_URL}images/ae.svg`;

interface Props {
  locationBonus: LocationBonus | null;
}

export default function CompaniesWidget({ locationBonus }: Props) {
  const { profile } = useProfile();
  const [open, setOpen] = useState(true);

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
          <div className="space-y-2">
            {profile.companies.map((company) => {
              const regionInfo = locationBonus?.regionById[company.region];
              const { totalBonus, depositMatch, ethics, industrialism, stratBonus } = (calcCompanyBonus(company, locationBonus) ?? {});
              const bonus = locationBonus ? totalBonus : null;

              return (
                <div
                  key={company._id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5"
                >
                  {/* Item icon + name */}
                  <img
                    src={itemImageUrl(company.itemCode)}
                    alt={itemName(company.itemCode)}
                    className="h-6 w-6 shrink-0 object-contain"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{company.name}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {/* {itemName(company.itemCode)} */}
                      {regionInfo && (
                        <> {regionInfo.name}, {regionInfo.countryName}</>
                      )}
                    </p>
                  </div>

                  {/* Comapny Levels */}
                  {!!company.activeUpgradeLevels.automatedEngine && (
                    <div className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                      <span className="font-bold">{company.activeUpgradeLevels.automatedEngine}</span>
                      <img src={AUTOMATED_ENGINE_ICON} alt="Automated Engine" className="h-3.5 w-3.5" />
                    </div>
                  )}
                  {!!company.activeUpgradeLevels.storage && (
                    <div className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                      <span className="font-bold">{company.activeUpgradeLevels.storage}</span>
                      <img src={STORAGE_ICON} alt="Storage" className="h-3.5 w-3.5" />
                    </div>
                  )}

                  {/* Workers */}
                  {!!company.workerCount && (
                    <div className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                      <span className="font-bold">{company.workerCount}</span>
                      <img src={WORKER_ICON} alt="PP" className="h-3.5 w-3.5" />
                    </div>
                  )}

                  {/* Income Tax badge */}
                  {regionInfo?.incomeTax && regionInfo.incomeTax > 0 && (
                    <span
                      className="shrink-0 rounded-full bg-yellow-900/50 px-2 py-0.5 text-xs text-yellow-400"
                    >
                      {regionInfo.incomeTax}%
                    </span>
                  )}

                  {/* Bonus badge */}
                  {bonus !== null ? (
                    <span
                      title={`Deposit: ${depositMatch}%\nStrat: ${stratBonus}%\nEthics: ${ethics}%`}
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${bonus > 0
                        ? "bg-emerald-900/50 text-emerald-400"
                        : "bg-zinc-800 text-zinc-500"
                        }`}
                    >
                      +{bonus}%
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                      —
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
