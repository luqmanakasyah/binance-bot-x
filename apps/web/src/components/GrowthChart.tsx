"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { DailyMetrics } from "@/types";
import { formatDate } from "@/utils/format";

function formatPercent(val: number) {
    return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(val / 100);
}

function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

export function GrowthChart({ data, showNet = false, heightClass = "h-64" }: { data: DailyMetrics[], showNet?: boolean, heightClass?: string }) {
    // Configuration based on mode
    const title = showNet ? "Daily Net PnL" : "Total Growth";
    const dataKey = showNet ? "net" : "cumulativeGrowth";
    const color = showNet ? "#3b82f6" : "#10b981"; // Blue vs Green
    const gradientId = showNet ? "colorNet" : "colorGrowth";
    const YAxisFormatter = showNet
        ? (val: number) => `$${val}`
        : (val: number) => `${val}%`;

    const TooltipFormatter = (value: number | undefined) => [
        value !== undefined ? (showNet ? formatCurrency(value) : formatPercent(value)) : (showNet ? "$0.00" : "0%"),
        showNet ? "Net PnL" : "Growth"
    ];

    return (
        <div className="rounded-lg border border-[#1f2937] bg-[#111827] p-6">
            <h3 className="mb-4 text-base font-semibold text-[#e5e7eb]">{title}</h3>
            <div className={`${heightClass} w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
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
                            tickFormatter={YAxisFormatter}
                            domain={
                                showNet
                                    ? ['auto', 'auto']
                                    : ([dataMin, dataMax]) => [0, Math.ceil(dataMax * 1.1 * 100) / 100]
                            }
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#111827", borderColor: "#374151" }}
                            itemStyle={{ color: color }}
                            labelStyle={{ color: "#9ca3af" }}
                            labelFormatter={(label) => formatDate(label)}
                            formatter={TooltipFormatter}
                        />
                        <ReferenceLine y={0} stroke="#4b5563" />
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            fill={`url(#${gradientId})`}
                            name={showNet ? "Net PnL" : "Growth"}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
