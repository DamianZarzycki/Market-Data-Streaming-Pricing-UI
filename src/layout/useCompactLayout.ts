import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useDensity, type Density } from "@/layout/DensityContext";

/** Initial collapsed value matching current density (avoids expand/collapse flash). */
export function collapsedForDensity(density: Density): boolean {
  return density === "compact";
}

/**
 * Syncs Filters / Side Drawer collapse state with global density.
 * Compact forces panels collapsed; Comfortable expands them.
 * Manual toggles still work until the next density change.
 */
export function useCompactLayout(options: {
  setFiltersCollapsed?: Dispatch<SetStateAction<boolean>>;
  setDrawerCollapsed?: Dispatch<SetStateAction<boolean>>;
}): void {
  const density = useDensity();
  const { setFiltersCollapsed, setDrawerCollapsed } = options;

  useEffect(() => {
    const collapsed = collapsedForDensity(density);
    setFiltersCollapsed?.(collapsed);
    setDrawerCollapsed?.(collapsed);
  }, [density, setFiltersCollapsed, setDrawerCollapsed]);
}
