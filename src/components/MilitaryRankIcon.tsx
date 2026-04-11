import React from "react";

const formatUrl = (rank: number) => `https://app.warera.io/images/ranks/rank${rank}.svg`;

const RankColorMap: Record<number, { color: string, bg: string }> = {
  36: {
    color: "#B2A9A6",
    bg: "linear-gradient(45deg,#221F1E,transparent)",
  },
  60: {
    color: "#9DB0BB",
    bg: "linear-gradient(45deg, #1A2126, transparent)"
  },
  92: {
    color: "#D6B672",
    bg: "linear-gradient(45deg,#3C3016,#1A150A)"
  },
  104: {
    color: "#85C481",
    bg: "linear-gradient(45deg,#142414,transparent)"
  },
  110: {
    color: "#7799E1",
    bg: "linear-gradient(45deg,#0D1932,transparent)"
  },
  116: {
    color: "#AF96D4",
    bg: "linear-gradient(45deg,#1F152E,transparent)"
  },
  120: {
    color: "#DE6F6F",
    bg: "linear-gradient(45deg,#2C0E0E,transparent)"
  },
}

export default function MilitaryRankIcon({ rank, imgClassName = "h-5 w-5", className = "p-2 rounded-md" }: { rank: number, className?: string, imgClassName?: string }) {
  if (rank > 120 || rank < 1) return null;
  const division = Object.keys(RankColorMap).find((key) => rank <= Number(key));
  if (!division) return null;
  const { color, bg } = RankColorMap[Number(division)];

  return (
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
  );
}
