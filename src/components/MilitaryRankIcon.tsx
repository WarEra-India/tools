import React from "react";
import MilitaryRanks from "../config/military-ranks.json"

const formatUrl = (rank: number) => `https://app.warera.io/images/ranks/rank${rank}.svg`;
const BASE_IMAGES_URL = `${import.meta.env.BASE_URL}images/`;


const RankColorMap: Record<number, { color: string, secondaryColor?: string, bg: string }> = {
  36: {
    color: "#B2A9A6",
    secondaryColor: "#887B77",
    bg: "linear-gradient(45deg,#221F1E,transparent)",
  },
  60: {
    color: "#9DB0BB",
    secondaryColor: "#698596",
    bg: "linear-gradient(45deg, #1A2126, transparent)"
  },
  92: {
    color: "#D6B672",
    secondaryColor: "#AB893F",
    bg: "linear-gradient(45deg,#3C3016,#1A150A)"
  },
  104: {
    color: "#85C481",
    secondaryColor: "#52924F",
    bg: "linear-gradient(45deg,#142414,transparent)"
  },
  110: {
    color: "#7799E1",
    secondaryColor: "#3664C9",
    bg: "linear-gradient(45deg,#0D1932,transparent)"
  },
  116: {
    color: "#AF96D4",
    secondaryColor: "#7D58B4",
    bg: "linear-gradient(45deg,#1F152E,transparent)"
  },
  120: {
    color: "#DE6F6F",
    secondaryColor: "#AE3737",
    bg: "linear-gradient(45deg,#2C0E0E,transparent)"
  },
}

const formatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1
});

export default function MilitaryRankIcon({ rank, imgClassName = "h-5 w-5", className = "p-2 rounded-md" }: { rank: number, className?: string, imgClassName?: string }) {
  if (rank > 120 || rank < 1) return null;

  const rankDetails = MilitaryRanks.find((r) => r.rank === rank);
  const division = Object.keys(RankColorMap).find((key) => rank <= Number(key));
  if (!division || !rankDetails) return null;
  const { color, bg, secondaryColor } = RankColorMap[Number(division)];

  return (
    <div className="flex items-center gap-2 rounded-md">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 justify-between">
          <span className="text-sm font-semibold" style={{ color: color }}>{rankDetails.name}</span>
          <span className="text-xs" style={{ color: secondaryColor }}>#{rank}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <img className="w-3 h-3" src={`${BASE_IMAGES_URL}attack.svg`} />
            <span className="text-xs" style={{ color: secondaryColor }}>+{rankDetails.bonus}%</span>
          </div>
          <div className="flex items-center gap-1">
            <img className="w-3 h-3" src={`${BASE_IMAGES_URL}damage.svg`} />
            <span className="text-xs" style={{ color: secondaryColor }}>{formatter.format(rankDetails.dmg)}</span>
          </div>
        </div>
      </div>
      <div style={{ background: bg, position: "relative" }} className={className}>
        <div
          className={imgClassName}
          style={{
            maskImage: `url(${formatUrl(rank)})`,
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center center",
            backgroundColor: color,
          }}
        />
        <div style={{ pointerEvents: "none", position: "absolute", overflow: "hidden", bottom: 0, top: 0, right: 0, left: 0 }}>
          <div style={{
            position: "absolute",
            height: "100%",
            width: "50%",
            top: "0px",
            background: "linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.07) 100%)",
            transform: "skewX(-25deg)",
            zIndex: 2,
            animation: "shine 3s linear infinite",
          }} />
        </div>
      </div>
    </div>
  );
}
