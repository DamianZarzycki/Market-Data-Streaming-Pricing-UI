export interface NavItem {
  path: string;
  label: string;
}

/** Sidebar navigation entries. `end` is applied to the root route only. */
export const navItems: NavItem[] = [
  { path: "/", label: "System Overview" },
  { path: "/market-data", label: "Market Data" },
  { path: "/pricing", label: "Pricing" },
  { path: "/books", label: "Books" },
  { path: "/trade-generation", label: "Trade Generation" },
  { path: "/trade-action", label: "Trade Action" },
  { path: "/blotter", label: "Blotter" },
  { path: "/monitoring", label: "Monitoring" },
];
