"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StatsCards } from "@/components/StatsCards";
import { BreakdownGrid } from "@/components/BreakdownGrid";
import { GrowthChart } from "@/components/GrowthChart";

// ... (keep existing imports)

// ... inside DateRange loop ...

// Recalc Daily (Simplified aggregation for Chart) - Only for In-Range events
const dailyMap: Record<string, DailyMetrics> = {};
// We need to iterate filteredEvents ascending to build graph? Or filtered dailyData?
// Using events is more accurate for arbitrary ranges.
filteredEvents.forEach(e => {
    const date = new Date(e.tsMs).toISOString().split('T')[0];
    if (!dailyMap[date]) {
        dailyMap[date] = {
            date, net: "0", realisedPnl: "0", funding: "0", commission: "0", transfer: "0", other: "0", count: 0, updatedAt: 0
        };
    }
    const d = dailyMap[date];
    const val = parseFloat(e.amount);
    const cat = classify(e.incomeType);

    if (cat !== 'transfer') d.net = (parseFloat(d.net) + val).toFixed(8);
    if (cat === 'realisedPnl') d.realisedPnl = (parseFloat(d.realisedPnl) + val).toFixed(8);
    if (cat === 'funding') d.funding = (parseFloat(d.funding) + val).toFixed(8);
    if (cat === 'commission') d.commission = (parseFloat(d.commission) + val).toFixed(8);
    if (cat === 'transfer') d.transfer = (parseFloat(d.transfer) + val).toFixed(8);
    d.count++;
});

// Convert key-map to array and sort ASCENDING by date for cumulative calc
const newDaily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

// Calculate Cumulative Growth
let runningNet = 0;
newDaily.forEach(d => {
    runningNet += parseFloat(d.net);
    // Growth % = (Cumulative Net / Initial Balance at Start of Range) * 100
    // Initial Balance at Start of Range = adjustedInitial
    d.cumulativeGrowth = adjustedInitial > 0 ? (runningNet / adjustedInitial) * 100 : 0;
});

// Sort DESCENDING for types/lists if needed?
// Usually charts expect ASC or DESC? Recharts expects array order. ASC is better for time series X-Axis.
// PnLChart uses XAxis. AreaChart plots in order.
// So keeping it ASC is correct for charts.

// Construct filtered metrics object
const newMetrics: LiveMetrics = {
    // ... (keep existing metrics)
    initialBalance: adjustedInitial.toFixed(8),
    // ...
};

return { metrics: newMetrics, dailyData: newDaily, events: filteredEvents };
    }, [metrics, dailyData, events, dateRange]);

// ...

return (
    <div className="min-h-screen bg-gray-950 text-white">
        <DashboardHeader
            lastUpdated={displayData.metrics?.lastUpdatedAt}
            trackingSince={displayData.metrics?.trackingSinceMs}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isFilterActive={!!(dateRange.start || dateRange.end)}
        />

        <main className="mx-auto max-w-7xl space-y-6 p-6">
            {/* Top Stats */}
            <StatsCards metrics={displayData.metrics} dailyData={displayData.dailyData} />

            {/* Growth Chart (Replaces Breakdowns) */}
            <GrowthChart data={displayData.dailyData} />

            {/* Daily Net Chart & Table */}
            <div className="grid gap-6 lg:grid-cols-2">
                <PnLChart data={displayData.dailyData} />
                <ClosedPositionsTable events={displayData.events} />
            </div>
        </main>
// ...

        <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            currentRange={dateRange}
            onApply={handleApplySettings}
        />
    </div>
);
}
