import { createContext, useContext, type ReactNode } from "react";

export type Density = "compact" | "comfortable";

const DensityContext = createContext<Density>("comfortable");

export function DensityProvider({
  density,
  children,
}: {
  density: Density;
  children: ReactNode;
}) {
  return (
    <DensityContext.Provider value={density}>{children}</DensityContext.Provider>
  );
}

export function useDensity(): Density {
  return useContext(DensityContext);
}
