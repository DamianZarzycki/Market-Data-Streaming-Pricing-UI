export type OptionRight = "CALL" | "PUT";

export interface EuropeanOptionInput {
  spot: number;
  strike: number;
  volatility: number;
  maturityYears: number;
  right: OptionRight;
}

function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

/** Hastings approximation of erf, close enough to math.erf for a premium preview. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

function intrinsic(spot: number, strike: number, right: OptionRight): number {
  if (right === "CALL") return Math.max(spot - strike, 0);
  return Math.max(strike - spot, 0);
}

/**
 * European Black-Scholes with r = 0 and q = 0, matching
 * pricing-service instruments_pricing/option_pricing_service.py.
 */
export function europeanOptionPremium(input: EuropeanOptionInput): number | null {
  const { spot, strike, volatility, maturityYears, right } = input;
  if (
    !Number.isFinite(spot) ||
    !Number.isFinite(strike) ||
    !Number.isFinite(volatility) ||
    !Number.isFinite(maturityYears)
  ) {
    return null;
  }
  if (spot <= 0 || strike <= 0) return 0;
  if (maturityYears <= 0 || volatility <= 0) {
    return intrinsic(spot, strike, right);
  }
  const sqrtT = Math.sqrt(maturityYears);
  const d1 =
    (Math.log(spot / strike) + 0.5 * volatility * volatility * maturityYears) /
    (volatility * sqrtT);
  const d2 = d1 - volatility * sqrtT;
  if (right === "CALL") {
    return spot * normCdf(d1) - strike * normCdf(d2);
  }
  return strike * normCdf(-d2) - spot * normCdf(-d1);
}
