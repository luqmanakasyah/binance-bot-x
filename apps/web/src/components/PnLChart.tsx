"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { DailyMetrics } from "@/types";

export function PnLChart({ data }: { data: DailyMetrics[] }) {
    const chartData = data.map(d => ({
        ...d,
        netNum: parseFloat(d.net)
    })).reverse(); // Data comes desc, we want asc for chart? Or if we fetch desc limit 30, reverse to show time L->R.

    return (
        <div className="h-80 w-full rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h3 className="mb-4 text-lg font-semibold text-white">Daily Net (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickFormatter={(val) => val.slice(5)} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }}
                        itemStyle={{ color: '#e5e7eb' }}
                    />
                    <ReferenceLine y={0} stroke="#4b5563" />
                    <Bar dataKey="netNum" fill="#fbbf24" radius={[2, 2, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
