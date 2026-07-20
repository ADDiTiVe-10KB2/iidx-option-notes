import type { ChartType } from "../types/chart";

interface ChartTypeTagProps {
  chartType: ChartType;
}

export function ChartTypeTag({ chartType }: ChartTypeTagProps) {
  return (
    <span className={`chart-type-tag chart-type-tag--${chartType.toLowerCase()}`}>
      {chartType}
    </span>
  );
}
