"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { DailyMetrics } from "@/types";
import { formatDate } from "@/utils/format";

function formatPercent(val: number) {
    return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(val / 100);
}

export function GrowthChart({ data }: { data: DailyMetrics[] }) {
    return (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-4 text-base font-semibold text-gray-200">Total Growth</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#6b7280"
                            fontSize={12}
                            tickFormatter={(str) => formatDate(str)}
                            minTickGap={30}
                        />
                        <YAxis
                            stroke="#6b7280"
                            fontSize={12}
                            tickFormatter={(val) => `${val}%`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#111827", borderColor: "#374151" }}
                            itemStyle={{ color: "#10b981" }}
                            labelStyle={{ color: "#9ca3af" }}
                            labelFormatter={(label) => formatDate(label)}
                            formatter={(value: number) => [
                                value !== undefined ? formatPercent(value) : "0%",
                                "Growth"
                            ]}
                        />
                        <ReferenceLine y={0} stroke="#4b5563" />
                        <Area
                            type="monotone"
                            dataKey="cumulativeGrowth"
                            stroke="#10b981"
                            fill="url(#colorGrowth)"
                            name="Growth"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
