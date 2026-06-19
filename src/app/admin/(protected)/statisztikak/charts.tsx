"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#5E7E62", "#E7AE8E", "#C7D1C5", "#2B2620", "#1A231E"];

const chartTheme = {
  axis: { stroke: "#4b5563", fontSize: 12 },
  grid: "#1f2937",
  tooltip: { backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 13 },
};

interface TimelinePoint {
  label: string;
  foglalas: number;
  kapcsolat: number;
}

interface RoomSlice {
  name: string;
  value: number;
}

interface OccupancyBar {
  name: string;
  percent: number;
}

interface HistBar {
  label: string;
  count: number;
}

interface Kpis {
  totalRequests: number;
  avgNights: number | null;
  avgGuests: number | null;
}

export function StatsCharts({
  timeline,
  roomDistribution,
  occupancy,
  occupancyLabel,
  leadTimeHistogram,
  seasonality,
  kpis,
}: {
  timeline: TimelinePoint[];
  roomDistribution: RoomSlice[];
  occupancy: OccupancyBar[];
  occupancyLabel: string;
  leadTimeHistogram: HistBar[];
  seasonality: HistBar[];
  kpis: Kpis;
}) {
  return (
    <div className="space-y-10">
      {/* KPI-kártyák */}
      <section className="grid grid-cols-3 gap-4">
        <KpiCard label="Foglalási kérések" value={String(kpis.totalRequests)} />
        <KpiCard label="Átlagos foglalt éjszaka" value={kpis.avgNights != null ? kpis.avgNights.toFixed(1) : "—"} />
        <KpiCard label="Átlagos létszám" value={kpis.avgGuests != null ? `${kpis.avgGuests.toFixed(1)} fő` : "—"} />
      </section>

      {/* 1. & 6. Idővonal */}
      <ChartCard title="Foglalási kérések és kapcsolatfelvételek időben">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={timeline}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke={chartTheme.axis.stroke} fontSize={chartTheme.axis.fontSize} />
            <YAxis stroke={chartTheme.axis.stroke} fontSize={chartTheme.axis.fontSize} allowDecimals={false} />
            <Tooltip contentStyle={chartTheme.tooltip} />
            <Legend />
            <Line type="monotone" dataKey="foglalas" name="Foglalási kérés" stroke="#5E7E62" strokeWidth={2} />
            <Line type="monotone" dataKey="kapcsolat" name="Kapcsolat" stroke="#E7AE8E" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* 2. Szoba szerinti megoszlás */}
        <ChartCard title="Foglalási kérések szoba szerint">
          {roomDistribution.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={roomDistribution} dataKey="value" nameKey="name" outerRadius={90} label>
                  {roomDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTheme.tooltip} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 3. Foglaltsági arány */}
        <ChartCard title={`Foglaltsági arány szobánként (${occupancyLabel})`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={occupancy}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={chartTheme.axis.stroke} fontSize={chartTheme.axis.fontSize} />
              <YAxis stroke={chartTheme.axis.stroke} fontSize={chartTheme.axis.fontSize} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={chartTheme.tooltip} formatter={(v) => [`${v}%`, "Foglalt"]} />
              <Bar dataKey="percent" name="Foglaltság" fill="#5E7E62" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5. Előfutási idő */}
        <ChartCard title="Foglalási előfutási idő (érkezésig hátralévő napok a kérés idején)">
          {leadTimeHistogram.every((b) => b.count === 0) ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={leadTimeHistogram}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke={chartTheme.axis.stroke} fontSize={11} />
                <YAxis stroke={chartTheme.axis.stroke} fontSize={chartTheme.axis.fontSize} allowDecimals={false} />
                <Tooltip contentStyle={chartTheme.tooltip} />
                <Bar dataKey="count" name="Kérések száma" fill="#E7AE8E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 7. Szezonalitás */}
        <ChartCard title="Szezonalitás (érkezési hónap szerint)">
          {seasonality.every((b) => b.count === 0) ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={seasonality}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke={chartTheme.axis.stroke} fontSize={chartTheme.axis.fontSize} />
                <YAxis stroke={chartTheme.axis.stroke} fontSize={chartTheme.axis.fontSize} allowDecimals={false} />
                <Tooltip contentStyle={chartTheme.tooltip} />
                <Bar dataKey="count" name="Érkezések" fill="#C7D1C5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-800 rounded-xl p-5">
      <p className="text-gray-500 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-display mt-1">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-300 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-[260px] flex items-center justify-center text-gray-500 text-sm">
      Még nincs elég adat ehhez a nézethez.
    </div>
  );
}
