import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Market } from "../types/polymarket";
import type { ArbitrageOpp } from "../websocket/types";
import type { PolymarketMarket, PolymarketAnalysis } from "../types/polymarket-stream";

interface ArbitrageFilters {
  minConfidence: number;
  minSpread: number;
}

interface BufferingState {
  chars: number;
  threshold: number;
}

interface ArbitrageState {
  opportunities: ArbitrageOpp[];
  selectedMarket: Market | null;
  filters: ArbitrageFilters;
  streamedMarkets: PolymarketMarket[];
  latestAnalysis: PolymarketAnalysis | null;
  isBuffering: boolean;
  bufferProgress: BufferingState | null;
  // Market order modal
  selectedMarketForOrder: PolymarketMarket | null;
  isOrderModalOpen: boolean;
}

interface ArbitrageActions {
  addOpportunity: (opp: ArbitrageOpp) => void;
  removeOpportunity: (id: string) => void;
  setSelectedMarket: (market: Market | null) => void;
  setFilters: (filters: Partial<ArbitrageFilters>) => void;
  clearOpportunities: () => void;
  setStreamedMarkets: (markets: PolymarketMarket[]) => void;
  setLatestAnalysis: (analysis: PolymarketAnalysis) => void;
  setBuffering: (buffering: BufferingState | null) => void;
  clearStreamedMarkets: () => void;
  // Market order modal
  openOrderModal: (market: PolymarketMarket) => void;
  closeOrderModal: () => void;
}

export const useArbitrageStore = create<ArbitrageState & ArbitrageActions>(
  (set) => ({
    opportunities: [],
    selectedMarket: null,
    filters: {
      minConfidence: 0,
      minSpread: 0,
    },
    streamedMarkets: [],
    latestAnalysis: null,
    isBuffering: false,
    bufferProgress: null,
    selectedMarketForOrder: null,
    isOrderModalOpen: false,

    addOpportunity: (opp) =>
      set((state) => {
        if (state.opportunities.some((o) => o.id === opp.id)) {
          return state;
        }
        return { opportunities: [...state.opportunities, opp] };
      }),

    removeOpportunity: (id) =>
      set((state) => ({
        opportunities: state.opportunities.filter((o) => o.id !== id),
      })),

    setSelectedMarket: (market) => set({ selectedMarket: market }),

    setFilters: (newFilters) =>
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
      })),

    clearOpportunities: () => set({ opportunities: [] }),

    setStreamedMarkets: (markets) => set({ streamedMarkets: markets }),

    setLatestAnalysis: (analysis) => set({ latestAnalysis: analysis }),

    setBuffering: (buffering) =>
      set({
        isBuffering: buffering !== null,
        bufferProgress: buffering,
      }),

    clearStreamedMarkets: () =>
      set({
        streamedMarkets: [],
        latestAnalysis: null,
        isBuffering: false,
        bufferProgress: null,
      }),

    openOrderModal: (market) =>
      set({ selectedMarketForOrder: market, isOrderModalOpen: true }),

    closeOrderModal: () =>
      set({ selectedMarketForOrder: null, isOrderModalOpen: false }),
  })
);

// Selector for filtered opportunities
export const useFilteredOpportunities = () =>
  useArbitrageStore(
    useShallow((state) =>
      state.opportunities.filter(
        (opp) =>
          opp.confidence >= state.filters.minConfidence &&
          opp.spread >= state.filters.minSpread
      )
    )
  );
