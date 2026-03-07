import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useProfile } from "@/lib/ProfileContext";
import { type LocationBonus, getEthicsBonus, combineStratAndEthics } from "@/lib/useLocationBonus";
import { itemName } from "@/lib/items";
import { itemImageUrl } from "@/lib/images";
import type { CompanyInfo } from "@/lib/wareraApi";

function calcCompanyBonus(company: CompanyInfo, locationBonus: LocationBonus): number | null {
  const region = locationBonus.regionById[company.region];
  if (!region) return null;
  const industrialism = locationBonus.countryIndustrialism[region.countryId] ?? 0;
  const depositMatch = region.depositType === company.itemCode ? region.depositBonus : 0;
  const ethics = getEthicsBonus(company.itemCode, industrialism);
  return depositMatch + combineStratAndEthics(region.stratBonus, ethics, industrialism);
}

const WORKER_ICON = `${import.meta.env.BASE_URL}images/worker.svg`;

interface Props {
  locationBonus: LocationBonus | null;
}

export default function CompaniesWidget({ locationBonus }: Props) {
  const { profile } = useProfile();

  if (!profile || profile.companies.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <Building2 className="h-3.5 w-3.5" />
          Companies of
          <img
            src={profile.user.avatarUrl}
            alt={profile.user.username}
            className="h-5 w-5 rounded-full border border-zinc-700 object-cover"
          />
          <span className="text-zinc-300">{profile.user.username}</span>
        </div>

        <div className="space-y-2">
          {profile.companies.map((company) => {
            const regionInfo = locationBonus?.regionById[company.region];
            const bonus = locationBonus ? calcCompanyBonus(company, locationBonus) : null;

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
                    {itemName(company.itemCode)}
                    {regionInfo && (
                      <> &mdash; {regionInfo.name}, {regionInfo.countryName}</>
                    )}
                  </p>
                </div>

                {/* Workers */}
                {!!company.workerCount  && (
                    <div className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                        <img src={WORKER_ICON} alt="PP" className="h-3.5 w-3.5" />
                        <span>{company.workerCount} workers</span>
                    </div>
                )}

                {/* Bonus badge */}
                {bonus !== null ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      bonus > 0
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
      </CardContent>
    </Card>
  );
}
