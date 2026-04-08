"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

/* ─── shared palette ─── */
const COLORS = {
  primary: "hsl(221, 83%, 53%)",
  emerald: "hsl(160, 84%, 39%)",
  amber: "hsl(38, 92%, 50%)",
  red: "hsl(0, 72%, 51%)",
  sky: "hsl(199, 89%, 48%)",
  violet: "hsl(258, 90%, 66%)",
  slate: "hsl(215, 16%, 47%)",
  orange: "hsl(25, 95%, 53%)",
};

const PIE_COLORS = [COLORS.emerald, COLORS.primary, COLORS.amber, COLORS.red, COLORS.violet, COLORS.orange, COLORS.slate, COLORS.sky];

function compactINR(v: number) {
  if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toFixed(0);
}

/* ─── Loan Status Distribution (Pie) ─── */
export function LoanStatusPie({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No loans yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => v} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ─── Portfolio Aging (Horizontal Bar) ─── */
export function PortfolioAgingBar({ data }: { data: { bucket: string; count: number; outstanding: number }[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data.</p>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={compactINR} />
        <YAxis type="category" dataKey="bucket" width={100} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => `₹ ${compactINR(v)}`} />
        <Bar dataKey="outstanding" fill={COLORS.primary} radius={[0, 4, 4, 0]} name="Outstanding" />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Collection Trend (Area Chart — last 7/30 days) ─── */
export function CollectionTrendArea({ data }: { data: { date: string; collected: number; due: number }[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data.</p>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: 10, right: 10, top: 10 }}>
        <defs>
          <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradDue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.amber} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.amber} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={compactINR} />
        <Tooltip formatter={(v: number) => `₹ ${compactINR(v)}`} />
        <Legend />
        <Area type="monotone" dataKey="due" stroke={COLORS.amber} fill="url(#gradDue)" name="Due" />
        <Area type="monotone" dataKey="collected" stroke={COLORS.emerald} fill="url(#gradCollected)" name="Collected" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ─── Branch Performance (Grouped Bar) ─── */
export function BranchPerformanceBar({ data }: { data: { branch: string; disbursed: number; collected: number; outstanding: number }[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data.</p>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ left: 10, right: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="branch" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={compactINR} />
        <Tooltip formatter={(v: number) => `₹ ${compactINR(v)}`} />
        <Legend />
        <Bar dataKey="disbursed" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Disbursed" />
        <Bar dataKey="collected" fill={COLORS.emerald} radius={[4, 4, 0, 0]} name="Collected" />
        <Bar dataKey="outstanding" fill={COLORS.red} radius={[4, 4, 0, 0]} name="Outstanding" />
      </BarChart>
    </ResponsiveContainer>
  );
}
