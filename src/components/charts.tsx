"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Label, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card } from "@/components/kit";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// All admin charts are shadcn/ui charts (ChartContainer + ChartTooltip) in the SpazaLink palette.
export const COLORS = { navy: "#062654", pink: "#F2366D", mustard: "#F4AF23", ok: "#1E8E5A", warn: "#D99A00", bad: "#D63A2F" };
const TICK = { fontSize: 12 };

export const compactRand = (n: number) =>
  n >= 1_000_000 ? `R${(n / 1_000_000).toFixed(1)}m` : n >= 1000 ? `R${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : `R${Math.round(n)}`;

export function ChartCard({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`p-6 ${className ?? ""}`}>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pink-600">{eyebrow}</p>}
      <h3 className="font-display text-lg font-bold tracking-tight text-brand">{title}</h3>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

type TipItem = { color?: string; payload?: { fill?: string; key?: string } };

/** Tooltip row with a colour dot, the series name and a formatted value. */
function TipRow({ name, value, color, format }: { name: string; value: unknown; color?: string; format: (n: number) => string }) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="size-2 rounded-full" style={{ background: color }} />
        {name}
      </span>
      <span className="num font-semibold text-foreground">{format(Number(value))}</span>
    </div>
  );
}

/** Single series line over time. */
export function TrendLine({
  data,
  x,
  y,
  name,
  color = COLORS.navy,
  format = (n: number) => String(n),
  height = 260,
}: {
  data: object[];
  x: string;
  y: string;
  name: string;
  color?: string;
  format?: (n: number) => string;
  height?: number;
}) {
  const config = { [y]: { label: name, color } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={x} tickLine={false} axisLine={false} tick={TICK} tickMargin={10} />
        <YAxis tickFormatter={format} tickLine={false} axisLine={false} width={56} tick={TICK} />
        <ChartTooltip
          cursor
          content={<ChartTooltipContent formatter={(v) => <TipRow name={name} value={v} color={color} format={format} />} />}
        />
        <Line
          type="monotone"
          dataKey={y}
          stroke={`var(--color-${y})`}
          strokeWidth={2}
          dot={{ r: 4, fill: `var(--color-${y})` }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

/** Single series bars. `colors` tints each bar by its own category (its label is always on the axis). */
export function Bars({
  data,
  x,
  y,
  name,
  color = COLORS.navy,
  colors,
  format = (n: number) => String(n),
  horizontal,
  height = 260,
}: {
  data: object[];
  x: string;
  y: string;
  name: string;
  color?: string;
  colors?: string[];
  format?: (n: number) => string;
  horizontal?: boolean;
  height?: number;
}) {
  const config = { [y]: { label: name, color } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={!horizontal} vertical={!!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tickFormatter={format} tickLine={false} axisLine={false} tick={TICK} />
            <YAxis type="category" dataKey={x} tickLine={false} axisLine={false} width={170} tick={{ fontSize: 11 }} />
          </>
        ) : (
          <>
            <XAxis dataKey={x} tickLine={false} axisLine={false} tick={TICK} tickMargin={10} interval={0} />
            <YAxis tickFormatter={format} tickLine={false} axisLine={false} width={56} tick={TICK} allowDecimals={false} />
          </>
        )}
        <ChartTooltip
          cursor={{ fill: "#FDE7EE", opacity: 0.6 }}
          content={
            <ChartTooltipContent
              formatter={(v, _n, item) => (
                <TipRow name={name} value={v} color={(item as TipItem).payload?.fill ?? (colors ? undefined : color)} format={format} />
              )}
            />
          }
        />
        <Bar isAnimationActive={false} dataKey={y} fill={`var(--color-${y})`} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 18 : 44}>
          {colors && data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** Stock health per shop: healthy, running low and critical counts stacked, with a legend. */
export function StockStack({ data, height = 300 }: { data: { shop: string; green: number; yellow: number; red: number }[]; height?: number }) {
  const config = {
    green: { label: "Healthy", color: COLORS.ok },
    yellow: { label: "Running low", color: COLORS.warn },
    red: { label: "Critical", color: COLORS.bad },
  } satisfies ChartConfig;
  const keys = Object.keys(config) as (keyof typeof config)[];
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} tick={TICK} allowDecimals={false} />
        <YAxis type="category" dataKey="shop" tickLine={false} axisLine={false} width={160} tick={{ fontSize: 11 }} />
        <ChartTooltip cursor={{ fill: "#FDE7EE", opacity: 0.6 }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {keys.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            stackId="stock"
            fill={`var(--color-${k})`}
            maxBarSize={18}
            stroke="#fff"
            strokeWidth={1}
            radius={i === keys.length - 1 ? [0, 4, 4, 0] : 0}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

/** Share of a whole, with the total in the middle. Every slice is named in the legend. */
export function Donut({
  data,
  centerLabel,
  height = 240,
  format = (n: number) => String(n),
}: {
  data: { key: string; label: string; value: number; color: string }[];
  centerLabel: string;
  height?: number;
  format?: (n: number) => string;
}) {
  const config: ChartConfig = Object.fromEntries(data.map((d) => [d.key, { label: d.label, color: d.color }]));
  const total = data.reduce((a, d) => a + d.value, 0);
  const rows = data.map((d) => ({ ...d, fill: `var(--color-${d.key})` }));
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              nameKey="key"
              formatter={(v, _n, item) => {
                const key = String((item as TipItem).payload?.key);
                return <TipRow name={String(config[key]?.label ?? key)} value={v} color={config[key]?.color} format={format} />;
              }}
            />
          }
        />
        <Pie isAnimationActive={false} data={rows} dataKey="value" nameKey="key" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="#fff" strokeWidth={2}>
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox) || viewBox.cx === undefined || viewBox.cy === undefined) return null;
              return (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan x={viewBox.cx} y={viewBox.cy - 6} className="fill-brand font-display text-2xl font-extrabold">
                    {format(total)}
                  </tspan>
                  <tspan x={viewBox.cx} y={viewBox.cy + 16} className="fill-muted-foreground text-xs">
                    {centerLabel}
                  </tspan>
                </text>
              );
            }}
          />
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="key" />} />
      </PieChart>
    </ChartContainer>
  );
}
