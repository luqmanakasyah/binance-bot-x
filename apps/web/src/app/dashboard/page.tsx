"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StatsCards } from "@/components/StatsCards";
import { BreakdownGrid } from "@/components/BreakdownGrid";
import { PnLChart } from "@/components/PnLChart";
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
    // Since this is client-side only (useEffect), we start with null to match server, then update.
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
            return { metrics, dailyData, events: events.slice(0, 100) }; // Show limited events for table by default
        }

        // Filter events
        const start = dateRange.start || 0;
        const end = dateRange.end || Date.now();
        // REMOVED simple filter: const filteredEvents = events.filter(e => e.tsMs >= start && e.tsMs <= end);

        // Recalculate Metrics
        let net = 0;
        let realisedPnl = 0;
        let funding = 0;
        let commission = 0;
        let transfer = 0;
        let wins = 0;
        let losses = 0;

        // Calculate Balance Offset (PnL before Start Date)
        // We assume 'events' contains enough history. If > 2000 events, this might be inaccurate without backend aggregation.
        let preRangeNet = 0;

        // Iterate ALL events to classify them into Pre-Range or In-Range
        // Note: 'events' are ordered desc, so we iterate and check. 
        // More efficient:

        // Grouping for Win/Loss (Symbol_Time)
        const closedPosMap: Record<string, number> = {};
        const filteredEvents: LedgerEvent[] = []; // Re-declare filteredEvents here

        events.forEach(e => {
            const val = parseFloat(e.amount);
            const cat = classify(e.incomeType);

            if (e.tsMs < start) {
                // Event happened BEFORE the range -> Contributes to Initial Balance for the range
                // Transfers definitely count towards balance.
                if (cat !== 'other') { // Realized, Funding, Commission, Transfer
                    preRangeNet += val;
                }
                return;
            }

            if (e.tsMs > end) {
                // Event happened AFTER the range -> Ignore
                return;
            }

            // In Range
            filteredEvents.push(e); // Add to filtered events for table/chart
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
        // Global Initial + Pre-Range Net (including transfers)
        const globalInitial = parseFloat(metrics?.initialBalance || "0");
        const adjustedInitial = globalInitial + preRangeNet;

        // Calc Wins/Losses
        Object.values(closedPosMap).forEach(pnl => {
            if (pnl > 0) wins++;
            else losses++;
        });

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
        const newDaily = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));

        // Construct filtered metrics object
        const newMetrics: LiveMetrics = {
            trackingSinceMs: start,
            lastUpdatedAt: Date.now(),
            netSinceT0: net.toFixed(4),
            netToday: "0", // Not relevant for range? Or calculate for "Today" within range?
            net7d: "0",
            realisedPnlToday: "0",
            fundingToday: "0",
            commissionToday: "0",
            transferToday: "0",
            realisedPnl7d: "0",
            funding7d: "0",
            commission7d: "0",
            transfer7d: "0",
            initialBalance: adjustedInitial.toFixed(8), // UPDATED
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

        // 3. Ledger Events Listener (Last 2000 for deep filtering)
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
            />
            {/* Settings Trigger (could be in header, but putting here for now or adding button) */}
            <div className="mx-auto max-w-7xl px-6 pt-4 flex justify-end">
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                >
                    <span>⚙️ Settings / Filter</span>
                    {(dateRange.start || dateRange.end) && <span className="ml-2 rounded bg-blue-600 px-2 py-0.5 text-xs text-white">Active</span>}
                </button>
            </div>

            <main className="mx-auto max-w-7xl space-y-6 p-6">
                {/* Top Stats */}
                <StatsCards metrics={displayData.metrics} dailyData={displayData.dailyData} />

                {/* Breakdowns */}
                <BreakdownGrid metrics={displayData.metrics} />

                {/* Chart & Table */}
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
