"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";

type SalesBySupplierChartProps = {
	data: Array<{
		supplier: string;
		total: number;
	}>;
};

const BAR_COLORS = ["#eadfcf", "#ddc8ad", "#ceb08f", "#c09a76", "#b08663", "#9f7352", "#8c6246", "#78513a"];

export function SalesBySupplierChart({ data }: SalesBySupplierChartProps) {
	const hasData = data.some((row) => row.total > 0);

	if (!hasData) {
		return <p className="text-sm text-slate-500">Aun no hay ventas por proveedor para mostrar.</p>;
	}

	return (
		<div className="h-72 w-full">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="supplier" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={54} />
					<YAxis tickFormatter={(value) => `${Math.round(Number(value))}`} tick={{ fontSize: 12 }} />
					<Tooltip formatter={(value: number) => [formatCurrency(Number(value)), "Ventas"]} />
					<Bar dataKey="total" radius={[6, 6, 0, 0]}>
						{data.map((row, index) => (
							<Cell key={row.supplier} fill={BAR_COLORS[index % BAR_COLORS.length]} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
