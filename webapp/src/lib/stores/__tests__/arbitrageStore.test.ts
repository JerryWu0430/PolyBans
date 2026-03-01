import { describe, it, expect, beforeEach } from "vitest";
import { useArbitrageStore } from "../arbitrageStore";
import type { ArbitrageOpp } from "@/lib/websocket/types";

function makeOpp(overrides: Partial<ArbitrageOpp> = {}): ArbitrageOpp {
  return {
    id: "opp1",
    marketA: { id: "m1", question: "Q1", slug: "q1" } as ArbitrageOpp["marketA"],
    marketB: { id: "m2", question: "Q2", slug: "q2" } as ArbitrageOpp["marketB"],
    spread: 0.05,
    confidence: 0.8,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("arbitrageStore", () => {
  beforeEach(() => {
    useArbitrageStore.setState({
      opportunities: [],
      selectedMarket: null,
      filters: { minConfidence: 0, minSpread: 0 },
      streamedMarkets: [],
      latestAnalysis: null,
      isBuffering: false,
      bufferProgress: null,
      selectedMarketForOrder: null,
      isOrderModalOpen: false,
    });
  });

  it("has correct initial state", () => {
    const state = useArbitrageStore.getState();
    expect(state.opportunities).toEqual([]);
    expect(state.streamedMarkets).toEqual([]);
    expect(state.latestAnalysis).toBeNull();
    expect(state.isBuffering).toBe(false);
    expect(state.isOrderModalOpen).toBe(false);
    expect(state.filters).toEqual({ minConfidence: 0, minSpread: 0 });
  });

  it("addOpportunity adds and deduplicates", () => {
    const opp = makeOpp();
    useArbitrageStore.getState().addOpportunity(opp);
    expect(useArbitrageStore.getState().opportunities).toHaveLength(1);

    // Adding same ID should not duplicate
    useArbitrageStore.getState().addOpportunity(opp);
    expect(useArbitrageStore.getState().opportunities).toHaveLength(1);

    // Different ID should add
    useArbitrageStore.getState().addOpportunity(makeOpp({ id: "opp2" }));
    expect(useArbitrageStore.getState().opportunities).toHaveLength(2);
  });

  it("removeOpportunity removes by id", () => {
    const opp = makeOpp();
    useArbitrageStore.getState().addOpportunity(opp);
    useArbitrageStore.getState().removeOpportunity("opp1");
    expect(useArbitrageStore.getState().opportunities).toHaveLength(0);
  });

  it("setFilters merges with existing filters", () => {
    useArbitrageStore.getState().setFilters({ minConfidence: 0.5 });
    expect(useArbitrageStore.getState().filters).toEqual({
      minConfidence: 0.5,
      minSpread: 0,
    });

    useArbitrageStore.getState().setFilters({ minSpread: 0.02 });
    expect(useArbitrageStore.getState().filters).toEqual({
      minConfidence: 0.5,
      minSpread: 0.02,
    });
  });

  it("clearStreamedMarkets resets stream state", () => {
    useArbitrageStore.setState({
      streamedMarkets: [{ id: "m1" }] as never[],
      latestAnalysis: { detected: true } as never,
      isBuffering: true,
      bufferProgress: { chars: 100, threshold: 300 },
    });

    useArbitrageStore.getState().clearStreamedMarkets();
    const state = useArbitrageStore.getState();
    expect(state.streamedMarkets).toEqual([]);
    expect(state.latestAnalysis).toBeNull();
    expect(state.isBuffering).toBe(false);
    expect(state.bufferProgress).toBeNull();
  });

  it("openOrderModal and closeOrderModal toggle state", () => {
    const market = { id: "m1", title: "Test" } as never;
    useArbitrageStore.getState().openOrderModal(market);
    expect(useArbitrageStore.getState().isOrderModalOpen).toBe(true);
    expect(useArbitrageStore.getState().selectedMarketForOrder).toBe(market);

    useArbitrageStore.getState().closeOrderModal();
    expect(useArbitrageStore.getState().isOrderModalOpen).toBe(false);
    expect(useArbitrageStore.getState().selectedMarketForOrder).toBeNull();
  });

  it("setBuffering updates isBuffering and bufferProgress", () => {
    useArbitrageStore.getState().setBuffering({ chars: 150, threshold: 300 });
    expect(useArbitrageStore.getState().isBuffering).toBe(true);
    expect(useArbitrageStore.getState().bufferProgress).toEqual({
      chars: 150,
      threshold: 300,
    });

    useArbitrageStore.getState().setBuffering(null);
    expect(useArbitrageStore.getState().isBuffering).toBe(false);
    expect(useArbitrageStore.getState().bufferProgress).toBeNull();
  });
});
