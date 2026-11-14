"use client";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const BRAND = ["#006a4e", "#2e9c72", "#5fb892", "#96d3b6", "#00563f"];
const tooltip = { contentStyle: { borderRadius: 12, border: "1px solid #dde5e1", fontSize: 12 } };

/** Thin, typed chart wrappers — pages pass already-localised labels/values; charts stay presentational. */
export function GroupedBarChart({ data, series }: { data: Array<Record<string, string | number>>; series: Array<{ key: string; label: string; color: string }> }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#eef2f0" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} />
        <Tooltip cursor={{ fill: "#e9f6f0" }} {...tooltip} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={28} animationDuration={900} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, center }: { data: Array<{ label: string; value: number; display: string }>; center: string }) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={62} outerRadius={92} paddingAngle={3} animationDuration={900} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={BRAND[i % BRAND.length]} />)}
          </Pie>
          <Tooltip formatter={(_, __, item) => (item.payload as { display: string }).display} {...tooltip} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <span className="text-lg font-bold text-ink">{center}</span>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-2 text-xs">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: BRAND[i % BRAND.length] }} />
            <span className="text-muted">{d.label}</span>
            <span className="ml-auto font-semibold">{d.display}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
