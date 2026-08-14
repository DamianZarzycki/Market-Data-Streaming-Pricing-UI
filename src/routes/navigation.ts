export interface NavItem {
  path: string;
  label: string;
  /** Compact label shown when the sidebar is collapsed. */
  short: string;
}

/** Sidebar navigation entries. `end` is applied to the root route only. */
export const navItems: NavItem[] = [
  { path: "/", label: "System Overview", short: "SO" },
  { path: "/market-data", label: "Market Data", short: "MD" },
  { path: "/pricing", label: "Pricing", short: "PR" },
  { path: "/books", label: "Books", short: "BK" },
  { path: "/trade-generation", label: "Trade Generation", short: "TG" },
  { path: "/trade-action", label: "Trade Action", short: "TA" },
  { path: "/blotter", label: "Blotter", short: "BL" },
  { path: "/monitoring", label: "Monitoring", short: "MO" },
];
