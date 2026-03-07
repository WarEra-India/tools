import { useMemo } from "react";
import { ArrowRight, Lightbulb, Plus, MoveRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useProfile } from "@/lib/ProfileContext";
import { type LocationBonus } from "@/lib/useLocationBonus";
import { itemName } from "@/lib/items";
import { itemImageUrl } from "@/lib/images";
import ProfileSearchBar from "@/components/ProfileSearchBar";
import type { FullProfile, CompanyInfo } from "@/lib/wareraApi";
import type { ProfitRow } from "@/calculators/company-production-profit/calculator";

/* ---- types ---- */

interface MoveAction {
  kind: "move";
  company: CompanyInfo;
  itemCode: string;
  fromRegion: string;
  fromCountry: string;
  fromBonus: number;
  toRegion: string;
  toCountry: string;
  toBonus: number;
  profitPer100PP: number;
  newProfitPer100PP: number;
  concreteCost: number;
  concreteQty: number;
}

interface ProduceAction {
  kind: "produce";
  itemCode: string;
  region: string;
  country: string;
  bonus: number;
  profitPer100PP: number;
  slotsAvailable: number;
  concreteQty: number;
  concreteCost: number;
}

type Action = MoveAction | ProduceAction;

/* ---- logic ---- */

function buildActions(
  profile: FullProfile,
  locationBonus: LocationBonus | null,
  profitRows: ProfitRow[],
  concretePrice: number,
): Action[] {
  const actions: Action[] = [];
  const profitMap = Object.fromEntries(profitRows.map((r) => [r.item, r]));

  // 1. Move – check each company against the best region
  if (locationBonus) {
    for (const company of profile.companies) {
      const code = company.itemCode;
      const best = locationBonus.bestByType[code];
      if (!best || best.bonus <= 0) continue;

      const current = locationBonus.regionById[company.region];
      const currentBonus = current?.bonus ?? 0;

      // Only recommend if the best region is actually better
      if (best.bonus <= currentBonus) continue;

      const row = profitMap[code];
      // profit/PP at current bonus
      const basePP = row?.basePP ?? 1;
      const currentProfitPer100 = row
        ? (row.profit / (basePP / (1 + currentBonus / 100))) * 100
        : 0;
      const newProfitPer100 = row
        ? (row.profit / (basePP / (1 + best.bonus / 100))) * 100
        : 0;

      actions.push({
        kind: "move",
        company,
        itemCode: code,
        fromRegion: current?.name ?? "Unknown",
        fromCountry: current?.countryName ?? "Unknown",
        fromBonus: currentBonus,
        toRegion: best.regionName,
        toCountry: best.countryName,
        toBonus: best.bonus,
        profitPer100PP: currentProfitPer100,
        newProfitPer100PP: newProfitPer100,
        concreteQty: 5,
        concreteCost: 5 * concretePrice,
      });
    }
  }

  // 2. Produce – if user has empty company slots
  const maxCompanies = profile.user.skills.companies?.total ?? 0;
  const currentCount = profile.companies.length;
  if (maxCompanies > currentCount && profitRows.length > 0) {
    const slotsAvailable = maxCompanies - currentCount;
    // Suggest an item the user doesn't already produce
    const existingItems = new Set(profile.companies.map((c) => c.itemCode));
    const bestRow = profitRows.find((r) => !existingItems.has(r.item)) ?? profitRows[0];
    const bestLoc = locationBonus?.bestByType[bestRow.item];
    // Next company number is currentCount + 1, cost = nextNumber * 50 concrete
    const nextCompanyNumber = currentCount + 1;
    const concreteQty = nextCompanyNumber * 50;
    actions.push({
      kind: "produce",
      itemCode: bestRow.item,
      region: bestLoc?.regionName ?? "Any",
      country: bestLoc?.countryName ?? "",
      bonus: bestLoc?.bonus ?? 0,
      profitPer100PP: bestRow.profitPP * 100,
      slotsAvailable,
      concreteQty,
      concreteCost: concreteQty * concretePrice,
    });
  }

  return actions;
}

/* ---- component ---- */

const COIN_ICON = `${import.meta.env.BASE_URL}images/game_coin.svg`;
const PP_ICON = `${import.meta.env.BASE_URL}images/production_point.svg`;

interface Props {
  locationBonus: LocationBonus | null;
  profitRows: ProfitRow[];
  concretePrice: number;
}

export default function RecommendationsWidget({ locationBonus, profitRows, concretePrice }: Props) {
  const { profile } = useProfile();

  const actions = useMemo(
    () => (profile ? buildActions(profile, locationBonus, profitRows, concretePrice) : []),
    [profile, locationBonus, profitRows, concretePrice],
  );

  // No profile: show search bar
  if (!profile) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <Lightbulb className="h-3.5 w-3.5" />
            Add your profile for personalised recommendations
          </div>
          <ProfileSearchBar />
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <Lightbulb className="h-3.5 w-3.5" />
          Recommendations for
          <img
            src={profile.user.avatarUrl}
            alt={profile.user.username}
            className="h-5 w-5 rounded-full border border-zinc-700 object-cover"
          />
          <span className="text-zinc-300">{profile.user.username}</span>
        </div>

        <div className="space-y-3">
          {actions.map((a, i) =>
            a.kind === "move" ? (
              <div
                key={i}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
              >
                {/* Action header */}
                <div className="flex items-center gap-2 mb-2">
                  <MoveRight className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">Move</span>
                  <img src={itemImageUrl(a.itemCode)} alt="" className="h-4 w-4 object-contain" />
                  <span className="text-sm text-zinc-200">{a.company.name}</span>
                </div>
                {/* Details grid */}
                <div className="ml-6 space-y-1 text-xs">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-zinc-500 w-16">Location</span>
                    <span>{a.fromRegion}, {a.fromCountry}</span>
                    <ArrowRight className="h-3 w-3 text-zinc-600" />
                    <span className="text-emerald-400">{a.toRegion}, {a.toCountry}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-zinc-500 w-16">Bonus</span>
                    <span>+{a.fromBonus}%</span>
                    <ArrowRight className="h-3 w-3 text-zinc-600" />
                    <span className="text-emerald-400">+{a.toBonus}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-zinc-500 w-16 shrink-0">Profit</span>
                    <span className="inline-flex items-center gap-0.5">
                      {a.profitPer100PP.toFixed(2)}
                      <img src={COIN_ICON} alt="" className="h-3 w-3" />
                    </span>
                    <ArrowRight className="h-3 w-3 text-zinc-600" />
                    <span className="inline-flex items-center gap-0.5 text-emerald-400">
                      {a.newProfitPer100PP.toFixed(2)}
                      <img src={COIN_ICON} alt="" className="h-3 w-3" />
                    </span>
                    <span className="text-zinc-600">per 100</span>
                    <img src={PP_ICON} alt="PP" className="h-3 w-3" />
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-zinc-500 w-16 shrink-0">Cost</span>
                    <span className="inline-flex items-center gap-1">
                      <img src={itemImageUrl("concrete")} alt="" className="h-3.5 w-3.5 object-contain" />
                      {a.concreteQty} Concrete
                    </span>
                    <span className="text-zinc-500">=</span>
                    <span className="inline-flex items-center gap-0.5 text-amber-300">
                      {a.concreteCost.toFixed(2)}
                      <img src={COIN_ICON} alt="" className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={i}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
              >
                {/* Action header */}
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Build</span>
                  <span className="text-sm text-zinc-200">
                    New Company
                    <span className="text-zinc-500 text-xs ml-1">
                      ({a.slotsAvailable} {a.slotsAvailable === 1 ? "slot" : "slots"} available)
                    </span>
                  </span>
                </div>
                {/* Details grid */}
                <div className="ml-6 space-y-1 text-xs">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-zinc-500 w-16">Item</span>
                    <img src={itemImageUrl(a.itemCode)} alt="" className="h-4 w-4 object-contain" />
                    <span className="text-zinc-200">{itemName(a.itemCode)}</span>
                    <span className="text-zinc-600">(best profit/PP)</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-zinc-500 w-16">Location</span>
                    <span className="text-emerald-400">{a.region}{a.country ? `, ${a.country}` : ""}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-zinc-500 w-16">Bonus</span>
                    <span className="text-emerald-400">+{a.bonus}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-zinc-500 w-16 shrink-0">Profit</span>
                    <span className="inline-flex items-center gap-0.5 text-emerald-400">
                      {a.profitPer100PP.toFixed(2)}
                      <img src={COIN_ICON} alt="" className="h-3 w-3" />
                    </span>
                    <span className="text-zinc-600">per 100</span>
                    <img src={PP_ICON} alt="PP" className="h-3 w-3" />
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-zinc-500 w-16 shrink-0">Cost</span>
                    <span className="inline-flex items-center gap-1">
                      <img src={itemImageUrl("concrete")} alt="" className="h-3.5 w-3.5 object-contain" />
                      {a.concreteQty} Concrete
                    </span>
                    <span className="text-zinc-500">=</span>
                    <span className="inline-flex items-center gap-0.5 text-amber-300">
                      {a.concreteCost.toFixed(2)}
                      <img src={COIN_ICON} alt="" className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
