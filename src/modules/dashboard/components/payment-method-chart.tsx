"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";

type PaymentMethodChartProps = {
  data: Array<{
    method: "EFECTIVO" | "TARJETA";
    total: number;
    count: number;
  }>;
};

const COLORS = {
  EFECTIVO: "#d7c2a3",
  TARJETA: "#8b5e3c"
} as const;

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const normalized = [
    {
      method: "EFECTIVO" as const,
      label: "Efectivo",
      total: data.find((row) => row.method === "EFECTIVO")?.total ?? 0,
      count: data.find((row) => row.method === "EFECTIVO")?.count ?? 0
    },
    {
      method: "TARJETA" as const,
      label: "Tarjeta",
      total: data.find((row) => row.method === "TARJETA")?.total ?? 0,
      count: data.find((row) => row.method === "TARJETA")?.count ?? 0
    }
  ];

  const hasSales = normalized.some((row) => row.total > 0);

  if (!hasSales) {
    return <p className="text-sm text-slate-500">Aun no hay ventas para mostrar.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={normalized} dataKey="total" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
            {normalized.map((entry) => (
              <Cell key={entry.method} fill={COLORS[entry.method]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, _name, payload) => {
              const row = payload?.payload as { count: number } | undefined;
              return [`${formatCurrency(Number(value))} (${row?.count ?? 0} ventas)`, "Total"];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
