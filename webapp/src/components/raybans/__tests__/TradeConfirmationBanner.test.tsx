import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TradeConfirmationBanner } from "../TradeConfirmationBanner";
import type {
  PolymarketMarket,
  SubMarket,
  MockTradeResult,
} from "@/lib/types/polymarket-stream";

const subMarket: SubMarket = {
  question: "Will the Lakers win tonight?",
  groupItemTitle: "Lakers to win",
  yesPrice: 0.62,
  noPrice: 0.38,
  volume: "500000",
  clobTokenId: "tok-1",
  slug: "lakers-win",
};

const market: PolymarketMarket = {
  id: "mkt-1",
  slug: "lakers-win",
  title: "Will the Lakers win?",
  question: "Will the Lakers win tonight?",
  volume: "500000",
  subMarkets: [subMarket],
  markets: [],
  sparkline: [],
  image: null,
};

const tradeResult: MockTradeResult = {
  orderId: "MOCK-ABC123",
  market: "Will the Lakers win?",
  outcome: "Lakers to win",
  price: 0.62,
  shares: 10,
  totalCost: 6.2,
  executedAt: Date.now(),
};

const noop = () => {};

describe("TradeConfirmationBanner", () => {
  it("renders nothing when state is idle", () => {
    const { container } = render(
      <TradeConfirmationBanner
        state="idle"
        market={market}
        subMarket={subMarket}
        timeoutProgress={0}
        lastTradeResult={null}
        onCancel={noop}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows announcing label for market_announced", () => {
    render(
      <TradeConfirmationBanner
        state="market_announced"
        market={market}
        subMarket={subMarket}
        timeoutProgress={0}
        lastTradeResult={null}
        onCancel={noop}
      />
    );
    expect(screen.getByText("ANNOUNCING MARKET...")).toBeInTheDocument();
    expect(screen.getByText("Lakers to win")).toBeInTheDocument();
    expect(screen.getByText(/Yes at 62¢/)).toBeInTheDocument();
  });

  it("shows awaiting label with cancel button and progress bar", () => {
    render(
      <TradeConfirmationBanner
        state="awaiting_confirmation"
        market={market}
        subMarket={subMarket}
        timeoutProgress={40}
        lastTradeResult={null}
        onCancel={noop}
      />
    );
    expect(screen.getByText("AWAITING VOICE CONFIRMATION")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
    // Progress bar inner div should have 60% width (100 - 40)
    const progressBar = document.querySelector("[style]");
    expect(progressBar).toHaveStyle({ width: "60%" });
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <TradeConfirmationBanner
        state="awaiting_confirmation"
        market={market}
        subMarket={subMarket}
        timeoutProgress={0}
        lastTradeResult={null}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("does not show cancel button in non-awaiting states", () => {
    render(
      <TradeConfirmationBanner
        state="executing"
        market={market}
        subMarket={subMarket}
        timeoutProgress={0}
        lastTradeResult={null}
        onCancel={noop}
      />
    );
    expect(screen.getByText("EXECUTING...")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows trade result when state is done", () => {
    render(
      <TradeConfirmationBanner
        state="done"
        market={market}
        subMarket={subMarket}
        timeoutProgress={0}
        lastTradeResult={tradeResult}
        onCancel={noop}
      />
    );
    expect(screen.getByText("TRADE EXECUTED")).toBeInTheDocument();
    expect(screen.getByText("10 shares")).toBeInTheDocument();
    expect(screen.getByText("Lakers to win")).toBeInTheDocument();
    expect(screen.getByText("62¢")).toBeInTheDocument();
    expect(screen.getByText(/MOCK-ABC123/)).toBeInTheDocument();
  });

  it("shows cancelled label", () => {
    render(
      <TradeConfirmationBanner
        state="cancelled"
        market={market}
        subMarket={subMarket}
        timeoutProgress={0}
        lastTradeResult={null}
        onCancel={noop}
      />
    );
    expect(screen.getByText("TRADE CANCELLED")).toBeInTheDocument();
  });

  it("shows market info for non-done states with market data", () => {
    render(
      <TradeConfirmationBanner
        state="awaiting_confirmation"
        market={market}
        subMarket={subMarket}
        timeoutProgress={0}
        lastTradeResult={null}
        onCancel={noop}
      />
    );
    expect(screen.getByText("Lakers to win")).toBeInTheDocument();
    expect(screen.getByText(/Will the Lakers win\?/)).toBeInTheDocument();
  });

  it("hides market info when state is done (shows result instead)", () => {
    render(
      <TradeConfirmationBanner
        state="done"
        market={market}
        subMarket={subMarket}
        timeoutProgress={0}
        lastTradeResult={tradeResult}
        onCancel={noop}
      />
    );
    // Market title should not appear in the market info section
    // (it does appear in trade result as outcome name, but the "(Will the Lakers win?)" parenthetical should be gone)
    const parenthetical = screen.queryByText("(Will the Lakers win?)");
    expect(parenthetical).not.toBeInTheDocument();
  });
});
