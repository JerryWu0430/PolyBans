"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, Radio, ExternalLink } from "lucide-react";
import type { PolymarketMarket } from "@/lib/types/polymarket-stream";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";

interface MarketsSidebarProps {
  markets: PolymarketMarket[];
  isStreaming?: boolean;
  className?: string;
}

export function MarketsSidebar({
  markets,
  isStreaming = false,
  className,
}: MarketsSidebarProps) {
  const openOrderModal = useArbitrageStore((s) => s.openOrderModal);

  return (
    <>
      <div
        className={cn(
          "w-80 border-l border-border/50 flex flex-col bg-card/30",
          className
        )}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-chart-4 animate-pulse" />
            <span className="text-sm font-bold tracking-wide">LIVE MARKETS</span>
          </div>
          {markets.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-chart-4/20 text-chart-4 rounded">
              {markets.length}
            </span>
          )}
        </div>

        {/* Markets List */}
        <div className="flex-1 overflow-y-auto scrollbar-terminal p-3 space-y-3">
          {markets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 py-8">
              <TrendingUp className="h-8 w-8 mb-3" />
              <p className="text-sm font-medium">No markets detected</p>
              <p className="text-xs mt-1 text-center px-4">
                {isStreaming
                  ? "Analyzing transcript..."
                  : "Start stream to detect markets"}
              </p>
            </div>
          ) : (
            markets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                onClick={() => openOrderModal(market)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function SparklineSvg({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;

  const pts = data.slice(-60); // last 60 points
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 0.01;

  const w = 240;
  const h = 48;
  const pad = 2;

  const points = pts.map((v, i) => {
    const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");

  // Area fill path
  const first = points[0].split(",");
  const last = points[points.length - 1].split(",");
  const areaPath = `M${first[0]},${h} L${polyline.replace(/(\d+\.?\d*),(\d+\.?\d*)/g, "L$1,$2").slice(1)} L${last[0]},${h} Z`;

  const latestPrice = pts[pts.length - 1];
  const isUp = pts[pts.length - 1] >= pts[0];
  const color = isUp ? "#22c55e" : "#ef4444";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${color})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Current price dot */}
      <circle
        cx={last[0]}
        cy={last[1]}
        r="3"
        fill={color}
      />
    </svg>
  );
}

function MarketCard({
  market,
  onClick,
}: {
  market: PolymarketMarket;
  onClick: () => void;
}) {
  // Find Yes and No outcomes
  const outcomes = market.markets ?? [];
  const isBinary =
    outcomes.length === 2 &&
    outcomes.some((o) => o.outcome.toLowerCase() === "yes") &&
    outcomes.some((o) => o.outcome.toLowerCase() === "no");

  const yesOutcome = outcomes.find((m) => m.outcome.toLowerCase() === "yes") ?? outcomes[0];
  const noOutcome = outcomes.find((m) => m.outcome.toLowerCase() === "no") ?? outcomes[1];
  const yesPrice = yesOutcome?.price ?? 0;
  const noPrice = noOutcome?.price ?? (1 - yesPrice);

  const yesColor =
    yesPrice >= 0.7
      ? "text-green-400 bg-green-400/10 border-green-400/30"
      : yesPrice <= 0.3
        ? "text-red-400 bg-red-400/10 border-red-400/30"
        : "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";

  // Multi-outcome: sort by price desc, show top 4
  const sortedOutcomes = [...outcomes].sort((a, b) => b.price - a.price).slice(0, 4);
  const maxPrice = sortedOutcomes[0]?.price ?? 1;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:bg-card/80 transition-all group overflow-hidden"
    >
      {/* Event image banner */}
      {market.image && (
        <div className="relative w-full h-20 overflow-hidden">
          <img
            src={market.image}
            alt=""
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        </div>
      )}

      <div className="p-3">
        {/* Question */}
        <h3 className="text-xs font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {market.question || market.title}
        </h3>

        {/* Odds — binary: big YES/NO, multi: ranked list */}
        {isBinary ? (
          <div className="flex gap-2 mb-3">
            <div className={cn("flex-1 rounded-lg border px-2 py-1.5 text-center", yesColor)}>
              <div className="text-lg font-bold font-mono leading-none">
                {Math.round(yesPrice * 100)}%
              </div>
              <div className="text-[9px] font-semibold tracking-widest mt-0.5 opacity-70">YES</div>
            </div>
            <div className="flex-1 rounded-lg border border-border/50 bg-muted/30 px-2 py-1.5 text-center">
              <div className="text-lg font-bold font-mono leading-none text-muted-foreground">
                {Math.round(noPrice * 100)}%
              </div>
              <div className="text-[9px] font-semibold tracking-widest mt-0.5 opacity-50">NO</div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 mb-3">
            {sortedOutcomes.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground truncate flex-1 min-w-0">{o.outcome}</span>
                <div className="w-20 h-1.5 rounded-full bg-muted/40 overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${(o.price / maxPrice) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono font-semibold w-8 text-right shrink-0">
                  {Math.round(o.price * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Volume + link */}
        <div className="flex items-center justify-between">
          {market.volume && (
            <p className="text-[10px] font-mono text-muted-foreground/70">
              VOL ${Number(market.volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          )}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 group-hover:text-primary/70 transition-colors">
            <ExternalLink className="h-3 w-3" />
            <span>polymarket.com</span>
          </div>
        </div>
      </div>
    </button>
  );
}
