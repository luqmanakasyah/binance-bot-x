"use client";

import { useRef } from "react";
import { LiveMetrics, DailyMetrics } from "@/types";

function formatCurrency(val: number | string) {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function formatPercent(val: number) {
    if (isNaN(val)) return "0.00%";
    return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(val);
}

function calculateSharpe(dailyData: DailyMetrics[]): number {
    if (dailyData.length < 2) return 0;
    // Note: This is simplified Sharpe based on Daily PnL Volatility, assuming risk-free rate = 0
    // returns = daily PnL (absolute)
    // stdDev of PnL
    const values = dailyData.map(d => parseFloat(d.net));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return (mean / stdDev) * Math.sqrt(365);
}

export function StatsCards({ metrics, dailyData }: { metrics?: LiveMetrics, dailyData?: DailyMetrics[] }) {
    const netTotal = parseFloat(metrics?.netSinceT0 || "0");
    const netToday = parseFloat(metrics?.netToday || "0");
    const net7d = parseFloat(metrics?.net7d || "0");

    // Growth
    const initial = parseFloat(metrics?.initialBalance || "0");
    const growthPct = initial > 0 ? (netTotal / initial) : 0;

    // Win Ratio
    const wins = metrics?.winCount || 0;
    const losses = metrics?.lossCount || 0;
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;

    // Sharpe
    const sharpe = calculateSharpe(dailyData || []);

    // Helper to format PnL with percentage
    const formatPnlWithPct = (pnl: number, pct: number) => {
        const sign = pnl >= 0 ? "+" : "";
        const pnlStr = formatCurrency(Math.abs(pnl));
        const pctStr = formatPercent(Math.abs(pct));
        return `${sign}${pnlStr} (${sign}${pctStr})`;
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Row 1: PnL Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* First Panel: Total PnL (%) */}
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                    <h3 className="text-sm font-medium text-gray-400">Total PnL (%)</h3>
                    <div className="mt-2">
                        <span className={`text-3xl font-bold ${netTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatPnlWithPct(netTotal, growthPct)}
                        </span>
                    </div>
                </div>

                <Card title="Net Today" value={netToday} fmt={formatCurrency} />
                <Card title="Net Last 7 Days" value={net7d} fmt={formatCurrency} />
            </div>

            {/* Row 2: Ratios (2-col) */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card title="Win Ratio" value={winRate} fmt={formatPercent}
                    forceColor={winRate >= 0.5 ? "text-green-400" : "text-yellow-400"}
                    sub={`(${wins}W / ${losses}L)`} />

                <Card title="Sharpe Ratio (Annualized)" value={sharpe} fmt={(v) => v.toFixed(2)}
                    forceColor={sharpe > 1 ? "text-green-400" : sharpe > 0 ? "text-blue-400" : "text-gray-400"} />
            </div>
        </div>
    );
}

function Card({ title, value, fmt, forceColor, sub }: {
    title: string,
    value: number,
    fmt: (v: number) => string,
    forceColor?: string,
    sub?: string
}) {
    const isPos = value >= 0;
    const colorClass = forceColor ? forceColor : (isPos ? "text-green-400" : "text-red-400");

    return (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-sm font-medium text-gray-400">{title}</h3>
            <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${colorClass}`}>
                    {(!forceColor && value > 0) ? "+" : ""}{fmt(value)}
                </span>
                {sub && <span className="text-sm text-gray-500">{sub}</span>}
            </div>
        </div>
    );
}
