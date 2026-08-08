import type {
  AuditLog,
  Book,
  LiveStatus,
  PortfolioSummary,
  Trade,
  Valuation,
} from "@/domain/types";
import type {
  BlotterAuditLogDto,
  BlotterBookDto,
  BlotterTradeDto,
  BlotterValuationDto,
} from "@/services/blotterTypes";

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function pickValuation(
  trade: BlotterTradeDto,
  latest?: BlotterValuationDto | null,
): BlotterValuationDto | null {
  return latest ?? trade.valuation ?? null;
}

export function mapBookDto(dto: BlotterBookDto): Book {
  return {
    book_id: dto.book_id,
    name: dto.name,
    description: dto.description ?? null,
    expected_asset_class: dto.expected_asset_class,
    is_active: dto.is_active,
    realized_pnl: asNumber(dto.realized_pnl),
    unrealized_pnl: asNumber(dto.unrealized_pnl),
    active_trades: asNumber(dto.active_trades),
  };
}

export function mapValuationDto(
  dto: BlotterValuationDto,
  options?: { status?: LiveStatus },
): Valuation {
  const createdAt =
    dto.created_at ?? dto.valuation_time ?? new Date().toISOString();

  return {
    trade_id: dto.trade_id ?? "",
    book_id: dto.book_id ?? "",
    asset_class: dto.asset_class ?? "",
    fair_value: asNumber(dto.fair_value) ?? 0,
    realized_pnl: asNumber(dto.realized_pnl) ?? 0,
    unrealized_pnl: asNumber(dto.unrealized_pnl) ?? 0,
    valuation_status: options?.status ?? "STALE",
    created_at: createdAt,
    alpha: asNumber(dto.alpha),
    beta: asNumber(dto.beta),
  };
}

export function mapTradeDto(
  dto: BlotterTradeDto,
  options?: {
    bookNameById?: Record<string, string>;
    latestValuation?: BlotterValuationDto | null;
  },
): Trade {
  const valuation = pickValuation(dto, options?.latestValuation);
  const hasLiveValuation = valuation != null;

  return {
    trade_id: dto.trade_id,
    book_id: dto.book_id,
    book_name: options?.bookNameById?.[dto.book_id],
    asset_class: dto.asset_class,
    symbol: dto.symbol,
    side: dto.side,
    quantity: asNumber(dto.quantity),
    trade_price: asNumber(dto.trade_price),
    currency: dto.trade_currency,
    status: dto.status,
    created_at: dto.created_at ?? dto.opened_at ?? dto.trade_date,
    realized_pnl: asNumber(valuation?.realized_pnl),
    unrealized_pnl: asNumber(valuation?.unrealized_pnl),
    alpha: asNumber(valuation?.alpha),
    beta: asNumber(valuation?.beta),
    valuation_status: hasLiveValuation ? "LIVE" : "STALE",
  };
}

export function applyLiveValuation(
  trade: Trade,
  valuation: BlotterValuationDto,
): Trade {
  if (valuation.trade_id && valuation.trade_id !== trade.trade_id) {
    return trade;
  }

  return {
    ...trade,
    realized_pnl: asNumber(valuation.realized_pnl) ?? trade.realized_pnl,
    unrealized_pnl: asNumber(valuation.unrealized_pnl) ?? trade.unrealized_pnl,
    alpha: asNumber(valuation.alpha) ?? trade.alpha,
    beta: asNumber(valuation.beta) ?? trade.beta,
    valuation_status: "LIVE",
  };
}

export function mapAuditLogDto(dto: BlotterAuditLogDto): AuditLog {
  return {
    id: dto.id ?? dto.audit_id,
    event_type: dto.event_type,
    message: dto.message,
    entity_type: dto.entity_type,
    correlation_id: dto.correlation_id,
    created_at: dto.created_at,
  };
}

export function computePortfolioSummary(trades: Trade[]): PortfolioSummary {
  let realized = 0;
  let unrealized = 0;
  let alphaSum = 0;
  let betaSum = 0;
  let alphaCount = 0;
  let betaCount = 0;

  for (const trade of trades) {
    realized += trade.realized_pnl ?? 0;
    unrealized += trade.unrealized_pnl ?? 0;
    if (typeof trade.alpha === "number") {
      alphaSum += trade.alpha;
      alphaCount += 1;
    }
    if (typeof trade.beta === "number") {
      betaSum += trade.beta;
      betaCount += 1;
    }
  }

  return {
    realized_pnl: realized,
    unrealized_pnl: unrealized,
    total_pnl: realized + unrealized,
    alpha: alphaCount > 0 ? alphaSum / alphaCount : 0,
    beta: betaCount > 0 ? betaSum / betaCount : 0,
  };
}

export function bookNameLookup(books: Book[]): Record<string, string> {
  return Object.fromEntries(books.map((book) => [book.book_id, book.name]));
}
