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

interface ShareableBoardProps {
    data: ShareableBoardData;
}

function SmallCard({ title, value, forceColor, sub }: { title: string, value: string, forceColor: string, sub?: string }) {
    return (
        <div className="flex h-full flex-col justify-center rounded-xl border border-[#1e3a8a4d] bg-[#0f1118] p-6 shadow-sm">
            <h3 className="text-sm font-medium text-[#9ca3af]">{title}</h3>
            <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold" style={{ color: forceColor }}>
                    {value}
                </span>
                {sub && <span className="text-sm text-[#6b7280]">{sub}</span>}
            </div>
        </div>
    );
}

export const ShareableBoard = forwardRef<HTMLDivElement, ShareableBoardProps>(({ data }, ref) => {
    return (
        <div ref={ref} className="w-[1600px] bg-[#02040a] p-8 text-white font-sans">
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

            {/* Charts Section */}
            <div className="grid grid-cols-2 gap-6 h-[400px]">
                {/* Total Growth */}
                <div className="rounded-xl border border-[#1e3a8a4d] bg-[#0f1118] p-6">
                    <h3 className="mb-4 text-base font-semibold text-[#e5e7eb]">Total Growth</h3>
                    <div className="h-[320px] w-full">
                        <GrowthChart data={data.growthData} />
                    </div>
                </div>

                {/* Daily Net PnL - Recreated AreaChart style from PnLChart but inline with hex */}
                <div className="rounded-xl border border-[#1e3a8a4d] bg-[#0f1118] p-6">
                    <h3 className="mb-4 text-base font-semibold text-[#e5e7eb]">Daily Net PnL</h3>
                    <div className="h-[320px] w-full">
                        {/* Inline Chart Implementation */}
                        <GrowthChart data={data.growthData} showNet={true} />
                    </div>
                </div>
            </div>

            {/* Footer / Timestamp */}
            <div className="mt-4 flex justify-between text-xs text-[#4b5563]">
                <span>{new Date().toUTCString()}</span>
                <span>binance-bot-x</span>
            </div>
        </div>
    );
});

ShareableBoard.displayName = "ShareableBoard";
