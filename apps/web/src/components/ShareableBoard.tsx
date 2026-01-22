"use client";

import { forwardRef } from "react";
import { DailyMetrics } from "@/types";
import { GrowthChart } from "./GrowthChart";

export interface ShareableBoardData {
    pnlStr: string;
    pnlColor: string;
    winRateStr: string;
    winRateColor: string;
    winLossSub: string;
    sharpe: string;
    sharpeColor: string;
    maxDD: string;
    maxDDColor: string;
    cdgr: string;
    cdgrColor: string;
    proj30: string;
    proj30Color: string;
    projAnn: string;
    projAnnColor: string;
    pctPerWin: string;
    pctPerWinColor: string;
    edge: string;
    edgeColor: string;
    growthData: DailyMetrics[];
}

function SmallCard({ title, value, forceColor, sub }: { title: string, value: string, forceColor: string, sub?: string }) {
    return (
        <div className="flex h-full flex-col justify-center rounded-xl border border-blue-900/30 bg-[#0f1118] p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-400">{title}</h3>
            <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${forceColor}`}>
                    {value}
                </span>
                {sub && <span className="text-sm text-gray-500">{sub}</span>}
            </div>
        </div>
    );
}

export const ShareableBoard = forwardRef<HTMLDivElement, { data: ShareableBoardData }>(({ data }, ref) => {
    return (
        <div ref={ref} className="w-[1200px] bg-[#02040a] p-8 text-white">
            {/* Grid 3x3 */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                <SmallCard title="Total PnL (%)" value={data.pnlStr} forceColor={data.pnlColor} />
                <SmallCard title="Win Ratio" value={data.winRateStr} forceColor={data.winRateColor} sub={data.winLossSub} />
                <SmallCard title="Annualised Sharpe Ratio" value={data.sharpe} forceColor={data.sharpeColor} />

                <SmallCard title="Max Drawdown" value={data.maxDD} forceColor={data.maxDDColor} />
                <SmallCard title="CDGR" value={data.cdgr} forceColor={data.cdgrColor} />
                <SmallCard title="30-Day Projected" value={data.proj30} forceColor={data.proj30Color} />

                <SmallCard title="Annual Projected" value={data.projAnn} forceColor={data.projAnnColor} />
                <SmallCard title="% per win" value={data.pctPerWin} forceColor={data.pctPerWinColor} />
                <SmallCard title="Edge" value={data.edge} forceColor={data.edgeColor} />
            </div>

            {/* Chart Section */}
            <div className="rounded-xl border border-blue-900/30 bg-[#0f1118] p-6 h-[400px]">
                <h3 className="mb-4 text-base font-semibold text-gray-200">Total Growth</h3>
                <div className="h-[320px] w-full">
                    {/* GrowthChart needs to be responsive to parent, but here parent is fixed width. 
                        Recharts ResponsiveContainer works based on parent size. */}
                    <GrowthChart data={data.growthData} />
                </div>
            </div>

            {/* Footer / Timestamp */}
            <div className="mt-4 flex justify-between text-xs text-gray-600">
                <span>{new Date().toUTCString()}</span>
                <span>binance-bot-x</span>
            </div>
        </div>
    );
});

ShareableBoard.displayName = "ShareableBoard";
