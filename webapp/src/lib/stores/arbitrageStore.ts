import { create } from "zustand";
import type { Market } from "../types/polymarket";
import type { ArbitrageOpp } from "../websocket/types";

interface ArbitrageFilters {
  minConfidence: number;
  minSpread: number;
}

interface ArbitrageState {
  opportunities: ArbitrageOpp[];
  selectedMarket: Market | null;
  filters: ArbitrageFilters;
}

interface ArbitrageActions {
  addOpportunity: (opp: ArbitrageOpp) => void;
  removeOpportunity: (id: string) => void;
  setSelectedMarket: (market: Market | null) => void;
  setFilters: (filters: Partial<ArbitrageFilters>) => void;
  clearOpportunities: () => void;
}

export const useArbitrageStore = create<ArbitrageState & ArbitrageActions>(
  (set) => ({
    opportunities: [],
    selectedMarket: null,
    filters: {
      minConfidence: 0,
      minSpread: 0,
    },

    addOpportunity: (opp) =>
      set((state) => {
        // Avoid duplicates
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
  })
);

// Selector for filtered opportunities
export const useFilteredOpportunities = () =>
  useArbitrageStore((state) =>
    state.opportunities.filter(
      (opp) =>
        opp.confidence >= state.filters.minConfidence &&
        opp.spread >= state.filters.minSpread
    )
  );
