import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AreaSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { MarketDataClass, PricePoint } from "@/services/marketDataTypes";
import {
  formatPrice,
  isRateQuoted,
  rateToPercent,
} from "@/views/MarketDataView/formatters";

interface ChartPoint {
  time: UTCTimestamp;
  value: number;
}

interface PriceSparklineProps {
  points: PricePoint[];
  instrumentKey?: string | null;
  currency?: string | null;
  dataClass?: MarketDataClass | null;
  height?: number;
}

export function PriceSparkline({
  points,
  instrumentKey,
  currency,
  dataClass,
  height = 160,
}: PriceSparklineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const prevChartDataRef = useRef<ChartPoint[] | null>(null);

  const asPercent = isRateQuoted(dataClass);
  const chartData = useMemo(
    () => toChartData(points, asPercent),
    [points, asPercent],
  );
  const canRenderChart = chartData.length >= 2;

  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const prices = points.map((p) => p.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      last: points[points.length - 1].price,
    };
  }, [points]);

  // Recreate when the series becomes eligible, scale mode, height, or instrument changes.
  useLayoutEffect(() => {
    if (!canRenderChart) {
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: Math.max(el.clientWidth, 240),
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#1c2330" },
        textColor: "#8b949e",
        fontFamily: "JetBrains Mono, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(42, 49, 60, 0.85)" },
        horzLines: { color: "rgba(42, 49, 60, 0.85)" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.15, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: true,
      },
      crosshair: {
        vertLine: {
          color: "rgba(59, 130, 246, 0.45)",
          labelBackgroundColor: "#3b82f6",
        },
        horzLine: {
          color: "rgba(59, 130, 246, 0.45)",
          labelBackgroundColor: "#3b82f6",
        },
      },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#3b82f6",
      topColor: "rgba(59, 130, 246, 0.35)",
      bottomColor: "rgba(59, 130, 246, 0.02)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: asPercent
        ? {
            type: "custom",
            formatter: (price: number) => `${price.toFixed(2)}%`,
            minMove: 0.01,
          }
        : {
            type: "price",
            precision: 4,
            minMove: 0.0001,
          },
    });

    series.setData(chartData);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;
    prevChartDataRef.current = chartData;

    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width > 0) {
        chart.applyOptions({ width, height });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      prevChartDataRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- full reset on instrument / scale / eligibility
  }, [canRenderChart, height, asPercent, instrumentKey]);

  useLayoutEffect(() => {
    if (!canRenderChart) return;
    const series = seriesRef.current;
    if (!series) return;
    if (prevChartDataRef.current === chartData) return;

    const prev = prevChartDataRef.current;
    prevChartDataRef.current = chartData;

    if (canUpdateLastBar(prev, chartData)) {
      series.update(chartData[chartData.length - 1]);
      return;
    }

    series.setData(chartData);
  }, [chartData, canRenderChart]);

  if (points.length === 0) {
    return (
      <div className="flex h-[160px] items-center justify-center rounded border border-border bg-surface-alt text-sm text-text-muted">
        No price history yet
      </div>
    );
  }

  if (!canRenderChart) {
    return (
      <div className="flex h-[160px] flex-col items-center justify-center gap-1 rounded border border-border bg-surface-alt">
        <span className="font-mono text-lg tabular-nums">
          {formatPrice(points[0].price, currency, 4, dataClass)}
        </span>
        <span className="text-sm text-text-muted">Waiting for more ticks…</span>
      </div>
    );
  }

  return (
    <div className="rounded border border-border bg-surface-alt px-2 py-2">
      <div
        ref={containerRef}
        className="w-full min-w-0"
        style={{ height, minHeight: height }}
        role="img"
        aria-label={asPercent ? "Rate history chart" : "Price history chart"}
      />
      {stats ? (
        <div className="mt-1 flex items-center justify-between px-1 text-sm text-text-muted">
          <span className="font-mono tabular-nums">
            {formatPrice(stats.min, currency, 4, dataClass)}
          </span>
          <span className="font-mono tabular-nums text-text">
            {formatPrice(stats.last, currency, 4, dataClass)}
          </span>
          <span className="font-mono tabular-nums">
            {formatPrice(stats.max, currency, 4, dataClass)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Same last bar (price change) or a newer bar appended — no left-edge trim. */
function canUpdateLastBar(
  prev: ChartPoint[] | null,
  next: ChartPoint[],
): boolean {
  if (!prev || prev.length === 0 || next.length === 0) return false;
  if (next[0].time !== prev[0].time) return false;

  const last = next[next.length - 1];
  const prevLast = prev[prev.length - 1];

  if (next.length === prev.length && last.time === prevLast.time) {
    return true;
  }
  return next.length === prev.length + 1 && last.time > prevLast.time;
}

/** Convert 1s-bucketed epoch ms to UTC seconds. Times are already unique. */
function toChartData(points: PricePoint[], asPercent: boolean): ChartPoint[] {
  return points.map((point) => ({
    time: Math.floor(point.t / 1000) as UTCTimestamp,
    value: asPercent ? rateToPercent(point.price) : point.price,
  }));
}
