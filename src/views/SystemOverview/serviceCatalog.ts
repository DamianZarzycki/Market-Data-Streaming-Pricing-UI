export type OverviewServiceId =
  | "market-data"
  | "pricing"
  | "books"
  | "trade-generation"
  | "trade-action"
  | "blotter"
  | "monitoring";

export interface RelatedLink {
  label: string;
  path: string;
  primary?: boolean;
}

export interface ServiceCatalogEntry {
  id: OverviewServiceId;
  /** Key in monitoring GET /status map (null = synthetic / self). */
  monitoringKeys: string[];
  label: string;
  description: string;
  route: string;
  /** Primary endpoint shown in vitals when BE has no override. */
  endpointHint: string;
  /** When healthy, show LIVE instead of UP (streaming / workers). */
  streaming: boolean;
  whatThisMeans: string;
  relatedLinks: RelatedLink[];
}

export const SERVICE_CATALOG: ServiceCatalogEntry[] = [
  {
    id: "market-data",
    monitoringKeys: ["market-data-service", "market-data"],
    label: "Market Data",
    description: "SSE ticks · options / IRS / curves",
    route: "/market-data",
    endpointHint: "/stream",
    streaming: true,
    whatThisMeans:
      "Publishes live market ticks over SSE. Downstream pricing and blotter freshness depend on this stream.",
    relatedLinks: [
      { label: "Open Market Data", path: "/market-data", primary: true },
      { label: "Open Monitoring", path: "/monitoring" },
      { label: "View Pricing stream", path: "/pricing" },
    ],
  },
  {
    id: "pricing",
    monitoringKeys: ["pricing-service", "pricing"],
    label: "Pricing",
    description: "Valuations · fair value / PnL",
    route: "/pricing",
    endpointHint: "/valuation-stream",
    streaming: true,
    whatThisMeans:
      "Marks open trades to market and streams valuations. Unrealized PnL and blotter marks come from here.",
    relatedLinks: [
      { label: "Open Pricing", path: "/pricing", primary: true },
      { label: "Open Market Data", path: "/market-data" },
      { label: "Open Blotter", path: "/blotter" },
    ],
  },
  {
    id: "books",
    monitoringKeys: ["book-service", "books", "books-service"],
    label: "Books",
    description: "Trading books CRUD",
    route: "/books",
    endpointHint: "/books",
    streaming: false,
    whatThisMeans:
      "Owns trading book definitions. Trade generation and blotter resolve books from this service.",
    relatedLinks: [
      { label: "Open Books", path: "/books", primary: true },
      { label: "Open Blotter", path: "/blotter" },
      { label: "Open Trade Generation", path: "/trade-generation" },
    ],
  },
  {
    id: "trade-generation",
    monitoringKeys: [
      "trade-generation-service",
      "trade-generation",
      "trade_generation",
    ],
    label: "Trade Generation",
    description: "Synthetic trade intents",
    route: "/trade-generation",
    endpointHint: "/status",
    streaming: true,
    whatThisMeans:
      "Produces OPEN/CLOSE intents on a timer or on demand. Feeds Trade Action asynchronously.",
    relatedLinks: [
      { label: "Open Trade Generation", path: "/trade-generation", primary: true },
      { label: "Open Trade Action", path: "/trade-action" },
      { label: "Open Books", path: "/books" },
    ],
  },
  {
    id: "trade-action",
    monitoringKeys: ["trade-action-service", "trade-action", "trade_action"],
    label: "Trade Action",
    description: "Accept → queue → DB",
    route: "/trade-action",
    endpointHint: "/status",
    streaming: true,
    whatThisMeans:
      "Accepts trade actions into a bounded queue and commits to the DB. Watch queue pressure and rejects here.",
    relatedLinks: [
      { label: "Open Trade Action", path: "/trade-action", primary: true },
      { label: "Open Trade Generation", path: "/trade-generation" },
      { label: "Open Blotter", path: "/blotter" },
    ],
  },
  {
    id: "blotter",
    monitoringKeys: ["blotter-service", "blotter"],
    label: "Blotter",
    description: "Trades · book PnL · audit",
    route: "/blotter",
    endpointHint: "/trades",
    streaming: false,
    whatThisMeans:
      "Read model for trades, valuations, and book-level PnL. System Overview PnL KPIs aggregate from here today.",
    relatedLinks: [
      { label: "Open Blotter", path: "/blotter", primary: true },
      { label: "Open Pricing", path: "/pricing" },
      { label: "Open Books", path: "/books" },
    ],
  },
  {
    id: "monitoring",
    monitoringKeys: ["monitoring-service", "monitoring"],
    label: "Monitoring",
    description: "Health probes · error aggregation",
    route: "/monitoring",
    endpointHint: "/status",
    streaming: false,
    whatThisMeans:
      "Probes sibling services and exposes aggregate health. System Overview polls this service for card status.",
    relatedLinks: [
      { label: "Open Monitoring", path: "/monitoring", primary: true },
      { label: "System Overview", path: "/" },
    ],
  },
];

export function getServiceCatalog(
  id: OverviewServiceId,
): ServiceCatalogEntry {
  const entry = SERVICE_CATALOG.find((item) => item.id === id);
  if (!entry) throw new Error(`Unknown service id: ${id}`);
  return entry;
}
