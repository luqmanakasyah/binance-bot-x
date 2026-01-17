"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { DailyMetrics } from "@/types";
import { formatDate } from "@/utils/format";

export function PnLChart({ data }: { data: DailyMetrics[] }) {
    return (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-4 text-base font-semibold text-gray-200">Daily Net PnL</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#111827", borderColor: "#374151" }}
                            itemStyle={{ color: "#e5e7eb" }}
                            labelStyle={{ color: "#9ca3af" }}
                            labelFormatter={(label) => formatDate(label)}
                        />
                        <ReferenceLine y={0} stroke="#4b5563" />
                        <Area type="monotone" dataKey="net" stroke="#3b82f6" fill="url(#colorNet)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
