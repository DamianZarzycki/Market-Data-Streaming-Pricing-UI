import { describe, expect, it } from "vitest";
import { europeanOptionPremium } from "@/views/TradeGenerationView/tradeTicket/europeanOptionPrice";
import { irsMaturityYears } from "@/views/TradeGenerationView/tradeTicket/quoteModel";

describe("europeanOptionPremium", () => {
  it("prices an at-the-money one-year call with r = 0", () => {
    const premium = europeanOptionPremium({
      spot: 100,
      strike: 100,
      volatility: 0.2,
      maturityYears: 1,
      right: "CALL",
    });
    expect(premium).not.toBeNull();
    expect(premium!).toBeCloseTo(7.965567, 3);
  });

  it("returns intrinsic value when maturity has passed", () => {
    expect(
      europeanOptionPremium({
        spot: 110,
        strike: 100,
        volatility: 0.2,
        maturityYears: 0,
        right: "CALL",
      }),
    ).toBe(10);
    expect(
      europeanOptionPremium({
        spot: 90,
        strike: 100,
        volatility: 0.2,
        maturityYears: 0,
        right: "PUT",
      }),
    ).toBe(10);
  });
});

describe("irsMaturityYears", () => {
  it("reads the tenor from an IRS symbol", () => {
    expect(irsMaturityYears("USD_5Y_IRS")).toBe(5);
    expect(irsMaturityYears("EUR_10Y_IRS")).toBe(10);
    expect(irsMaturityYears("USD_6M_IRS")).toBe(0.5);
    expect(irsMaturityYears("AAPL")).toBeNull();
  });
});
