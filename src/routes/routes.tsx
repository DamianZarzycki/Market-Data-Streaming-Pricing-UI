import type { RouteObject } from "react-router-dom";
import { AppShell } from "@/layout/AppShell";
import { SystemOverview } from "@/views/SystemOverview/SystemOverview";
import { MarketDataView } from "@/views/MarketDataView/MarketDataView";
import { PricingView } from "@/views/PricingView/PricingView";
import { BooksView } from "@/views/BooksView/BooksView";
import { TradeGenerationView } from "@/views/TradeGenerationView/TradeGenerationView";
import { TradeActionView } from "@/views/TradeActionView/TradeActionView";
import { BlotterView } from "@/views/BlotterView/BlotterView";
import { TradeDetailsView } from "@/views/TradeDetailsView/TradeDetailsView";
import { MonitoringView } from "@/views/MonitoringView/MonitoringView";
import { MarketChartPopout } from "@/views/MarketDataView/MarketChartPopout";

export const routes: RouteObject[] = [
  {
    path: "popout/market-chart",
    element: <MarketChartPopout />,
  },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <SystemOverview /> },
      { path: "market-data", element: <MarketDataView /> },
      { path: "pricing", element: <PricingView /> },
      { path: "books", element: <BooksView /> },
      { path: "trade-generation", element: <TradeGenerationView /> },
      { path: "trade-action", element: <TradeActionView /> },
      { path: "blotter", element: <BlotterView /> },
      { path: "blotter/trades/:tradeId", element: <TradeDetailsView /> },
      { path: "monitoring", element: <MonitoringView /> },
      { path: "*", element: <SystemOverview /> },
    ],
  },
];
