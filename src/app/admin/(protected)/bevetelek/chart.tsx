"use client";

import { useRouter } from "next/navigation";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const MONTHS = ["jan", "febr", "márc", "ápr", "máj", "jún", "júl", "aug", "szept", "okt", "nov", "dec"];
const ft = (n: number) => `${Math.round(n).toLocaleString("hu-HU")} Ft`;
const short = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString("hu-HU", { maximumFractionDigits: 1 })} millió`
    : n >= 1000
      ? `${Math.round(n / 1000)} ezer`
      : String(n);

export interface ChartMonth {
  month: number;
  befolyt: number;
  varhato: number;
  lastYear: number | null;
}

// Havi oszlopok: befolyt (sötétzöld) + várható (barack), a tavalyi év halvány vonallal.
// Egy hónapra kattintva a Foglalások lista arra a hónapra szűrve nyílik meg.
export function RevenueChart({ year, months }: { year: number; months: ChartMonth[] }) {
  const router = useRouter();
  const data = months.map((m) => ({ ...m, name: MONTHS[m.month] }));
  const hasLastYear = months.some((m) => m.lastYear != null);
  const open = (month: number) => router.push(`/admin/foglalasok?ho=${year}-${String(month + 1).padStart(2, "0")}`);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E2DDD7" vertical={false} />
          <XAxis dataKey="name" stroke="#9B9690" fontSize={12} tickLine={false} />
          <YAxis stroke="#9B9690" fontSize={12} tickFormatter={short} width={72} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v, name) => [ft(Number(v)), name === "befolyt" ? "Befolyt" : name === "varhato" ? "Várható" : `Tavaly (${year - 1})`]}
            labelFormatter={(l) => `${year}. ${l}.`}
            contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2DDD7", borderRadius: 8, fontSize: 13 }}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar dataKey="befolyt" stackId="a" fill="#5A7A5C" cursor="pointer" onClick={(d) => open((d as unknown as ChartMonth).month)} />
          <Bar dataKey="varhato" stackId="a" fill="#E8A882" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d) => open((d as unknown as ChartMonth).month)} />
          {hasLastYear && <Line dataKey="lastYear" stroke="#B9B3AC" strokeWidth={2} strokeDasharray="4 4" dot={false} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
