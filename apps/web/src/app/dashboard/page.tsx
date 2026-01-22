"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StatsCards } from "@/components/StatsCards";
import { PnLChart } from "@/components/PnLChart";
import { GrowthChart } from "@/components/GrowthChart";
import { ClosedPositionsTable } from "@/components/ClosedPositionsTable";
import { SettingsModal } from "@/components/SettingsModal";
import { DailyMetrics, LedgerEvent, LiveMetrics } from "@/types";

// Duplicate classify logic here if not available on client
function classify(type: string): string {
    const REALIZED_PNL = ["REALIZED_PNL"];
    const FUNDING_FEE = ["FUNDING_FEE"];
    const COMMISSION = ["COMMISSION"];
    const TRANSFER = ["TRANSFER"];
    if (REALIZED_PNL.includes(type)) return "realisedPnl";
    if (FUNDING_FEE.includes(type)) return "funding";
    if (COMMISSION.includes(type)) return "commission";
    if (TRANSFER.includes(type)) return "transfer";
    return "other";
}

export default function DashboardPage() {
    const router = useRouter();
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Filter State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    // Initialize dateRange from localStorage if possible, or null.
    const [dateRange, setDateRange] = useState<{ start: number | null, end: number | null }>({ start: null, end: null });

    // Load persisted settings on mount
    useEffect(() => {
        const stored = localStorage.getItem("dashboard_settings_range");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Simple validation
                if (parsed && (typeof parsed.start === 'number' || parsed.start === null)) {
                    setDateRange(parsed);
                }
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
    }, []);

    const handleApplySettings = (range: { start: number | null, end: number | null }) => {
        setDateRange(range);
        localStorage.setItem("dashboard_settings_range", JSON.stringify(range));
    };

    // Raw Data
    const [metrics, setMetrics] = useState<LiveMetrics | undefined>(undefined);
    const [dailyData, setDailyData] = useState<DailyMetrics[]>([]);
    const [events, setEvents] = useState<LedgerEvent[]>([]); // Now holds 2000 events

    // Derived Data
    const displayData = useMemo(() => {
        // If no filter, return raw data directly (fast path)
        if (!dateRange.start && !dateRange.end) {
            // Even in fast path, we might want to populate charts. Ideally backend should define cumulativeGrowth or we calculate it here too.
            // For now, let's recalculate even for default view to be consistent, OR map existing dailyData if needed.
            // But existing dailyData from Firestore doesn't have cumulativeGrowth.
            // So we should just run the main logic unless performance is an issue.
            // However, simpler to just run logic.
        }

        // Filter events
        const start = dateRange.start || 0;
        const end = dateRange.end || Date.now();

        // Recalculate Metrics
        let net = 0;
        let realisedPnl = 0;
        let funding = 0;
        let commission = 0;
        let transfer = 0;
        let wins = 0;
        let losses = 0;

        // Calculate Balance Offset (PnL before Start Date)
        let preRangeNet = 0;

        // Grouping for Win/Loss (Symbol_Time)
        const closedPosMap: Record<string, number> = {};
        const filteredEvents: LedgerEvent[] = [];

        events.forEach(e => {
            const val = parseFloat(e.amount);
            const cat = classify(e.incomeType);

            if (e.tsMs < start) {
                if (cat !== 'other') { // Realized, Funding, Commission, Transfer
                    preRangeNet += val;
                }
                return;
            }

            if (e.tsMs > end) {
                return;
            }

            // In Range
            filteredEvents.push(e);
            if (cat !== 'transfer') {
                net += val;
            }

            if (cat === 'realisedPnl') {
                realisedPnl += val;
                const key = `${e.symbol}_${e.tsMs}`;
                closedPosMap[key] = (closedPosMap[key] || 0) + val;
            } else if (cat === 'funding') {
                funding += val;
            } else if (cat === 'commission') {
                commission += val;
            } else if (cat === 'transfer') {
                transfer += val;
            }
        });

        // Adjust Initial Balance
        const globalInitial = parseFloat(metrics?.initialBalance || "0");
        const adjustedInitial = globalInitial + preRangeNet;

        // Calc Wins/Losses
        Object.values(closedPosMap).forEach(pnl => {
            if (pnl > 0) wins++;
            else losses++;
        });

        // Recalc Daily
        const dailyMap: Record<string, DailyMetrics> = {};

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

        // Sort ascending by date
        const newDaily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

        // insert 0% start point (Day before first data point)
        if (newDaily.length > 0) {
            const firstDateStr = newDaily[0].date;
            try {
                const d = new Date(firstDateStr);
                d.setDate(d.getDate() - 1); // Yesterday
                const prevDateStr = d.toISOString().split('T')[0];

                newDaily.unshift({
                    date: prevDateStr,
                    net: "0", realisedPnl: "0", funding: "0", commission: "0", transfer: "0", other: "0", count: 0, updatedAt: 0,
                    cumulativeGrowth: 0 // Explicitly 0
                });
            } catch (e) {
                // Ignore error matching date
            }
        }

        // Calculate Cumulative Growth
        let runningNet = 0;
        newDaily.forEach(d => {
            runningNet += parseFloat(d.net);
            d.cumulativeGrowth = adjustedInitial > 0 ? (runningNet / adjustedInitial) * 100 : 0;
        });

        const newMetrics: LiveMetrics = {
            trackingSinceMs: start,
            lastUpdatedAt: Date.now(),
            netSinceT0: net.toFixed(4),
            netToday: "0",
            net7d: "0",
            realisedPnlToday: "0",
            fundingToday: "0",
            commissionToday: "0",
            transferToday: "0",
            realisedPnl7d: "0",
            funding7d: "0",
            commission7d: "0",
            transfer7d: "0",
            initialBalance: adjustedInitial.toFixed(8),
            winCount: wins,
            lossCount: losses
        };

        return { metrics: newMetrics, dailyData: newDaily, events: filteredEvents };
    }, [metrics, dailyData, events, dateRange]);

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push("/login");
            } else {
                setLoadingAuth(false);
            }
        });
        return () => unsubAuth();
    }, [router]);

    useEffect(() => {
        if (loadingAuth) return;

        // 1. Live Metrics Listener
        const unsubMetrics = onSnapshot(doc(db, "metrics_live", "current"), (docSnap) => {
            if (docSnap.exists()) {
                setMetrics(docSnap.data() as LiveMetrics);
            }
        });

        // 2. Daily Data Listener (Last 30 days)
        const qDaily = query(collection(db, "daily"), orderBy("date", "desc"), limit(30));
        const unsubDaily = onSnapshot(qDaily, (snap) => {
            const items: DailyMetrics[] = [];
            snap.forEach(d => items.push(d.data() as DailyMetrics));
            setDailyData(items);
        });

        // 3. Ledger Events Listener (Last 2000)
        const qLedger = query(collection(db, "ledger_events"), orderBy("tsMs", "desc"), limit(2000));
        const unsubLedger = onSnapshot(qLedger, (snap) => {
            const items: LedgerEvent[] = [];
            snap.forEach(d => items.push(d.data() as LedgerEvent));
            setEvents(items);
        });

        return () => {
            unsubMetrics();
            unsubDaily();
            unsubLedger();
        };
    }, [loadingAuth]);

    if (loadingAuth) {
        return <div className="flex h-screen items-center justify-center bg-gray-950 text-white">Loading...</div>;
    }

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

                {/* Growth Chart */}
                <GrowthChart data={displayData.dailyData} />

                {/* Daily Net Chart & Table */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <PnLChart data={displayData.dailyData} />
                    <ClosedPositionsTable events={displayData.events} />
                </div>
            </main>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentRange={dateRange}
                onApply={handleApplySettings}
            />
        </div>
    );
}
