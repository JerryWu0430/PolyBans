"use client";

import { useEffect } from "react";
import {
  ArbitrageList,
  OddsComparison,
  SentimentGauge,
  MarketTrends,
} from "@/components/dashboard";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";
import { useStreamStore } from "@/lib/stores/streamStore";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

export default function ArbitragePage() {
  const { subscribe, isConnected } = useWebSocket();
  const addOpportunity = useArbitrageStore((s) => s.addOpportunity);
  const setAnalysis = useStreamStore((s) => s.setAnalysis);

  // Subscribe to WebSocket messages
  useEffect(() => {
    const unsubArbitrage = subscribe("ARBITRAGE_OPPORTUNITY", (payload) => {
      addOpportunity(payload);
    });

    const unsubAnalysis = subscribe("ANALYSIS_RESULT", (payload) => {
      setAnalysis(payload);
    });

    return () => {
      unsubArbitrage();
      unsubAnalysis();
    };
  }, [subscribe, addOpportunity, setAnalysis]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Arbitrage Dashboard</h1>
        <Badge
          variant="outline"
          className={
            isConnected
              ? "bg-green-500/10 text-green-600 border-green-500/20"
              : "bg-red-500/10 text-red-600 border-red-500/20"
          }
        >
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3 mr-1" />
              Live
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 mr-1" />
              Disconnected
            </>
          )}
        </Badge>
      </div>

      {/* Dashboard layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-0">
        {/* Sidebar - Market Trends */}
        <aside className="lg:h-full overflow-hidden">
          <MarketTrends />
        </aside>

        {/* Main content area */}
        <main className="flex flex-col gap-4 min-h-0">
          {/* Top row - Odds & Sentiment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OddsComparison />
            <SentimentGauge />
          </div>

          {/* Bottom - Arbitrage List */}
          <div className="flex-1 min-h-[400px]">
            <ArbitrageList />
          </div>
        </main>
      </div>
    </div>
  );
}
