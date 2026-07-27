"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { useChartColors } from "./useChartColors";

export type BudgetChartRow = {
  category: string;
  costCode: string;
  budgeted: number;
  actual: number;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[var(--border-hairline)] bg-surface-1 px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium text-text-primary">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-text-secondary">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="tabular-nums text-text-primary">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function BudgetChart({ data }: { data: BudgetChartRow[] }) {
  const colors = useChartColors();

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barGap={2}>
          <CartesianGrid vertical={false} stroke={colors.gridline} />
          <XAxis
            dataKey="costCode"
            tickLine={false}
            axisLine={{ stroke: colors.gridline }}
            tick={{ fill: colors.muted, fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: colors.muted, fontSize: 11 }}
            tickFormatter={(v) => formatCompactCurrency(Number(v))}
            width={56}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: colors.gridline, opacity: 0.4 }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: colors.secondary }}
          />
          <Bar dataKey="budgeted" name="Budgeted" fill={colors.cat1} radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Bar dataKey="actual" name="Actual" fill={colors.cat2} radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
