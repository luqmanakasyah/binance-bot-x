"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StatsCards } from "@/components/StatsCards";
import { PnLChart } from "@/components/PnLChart";
import { ShareableBoard, ShareableBoardData } from "@/components/ShareableBoard";
import { GrowthChart } from "@/components/GrowthChart";
import { ClosedPositionsTable } from "@/components/ClosedPositionsTable";
import { SettingsModal } from "@/components/SettingsModal";
import html2canvas from "html2canvas";
import { useRef } from "react";
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

        // Calculate Cumulative Growth (on clean data)
        let runningNet = 0;
        newDaily.forEach(d => {
            runningNet += parseFloat(d.net);
            d.cumulativeGrowth = adjustedInitial > 0 ? (runningNet / adjustedInitial) * 100 : 0;
        });

        // Create Growth Data with Anchor Point (Start Date - 1, 0%)
        let growthData = [...newDaily];
        if (newDaily.length > 0) {
            const firstDateStr = newDaily[0].date;
            try {
                const d = new Date(firstDateStr);
                d.setDate(d.getDate() - 1); // Yesterday
                const prevDateStr = d.toISOString().split('T')[0];

                growthData.unshift({
                    date: prevDateStr,
                    net: "0", realisedPnl: "0", funding: "0", commission: "0", transfer: "0", other: "0", count: 0, updatedAt: 0,
                    cumulativeGrowth: 0 // Explicitly 0
                });
            } catch (e) {
                // Ignore
            }
        } else {
            // If no data, maybe add anchor at Start Date if known? Or just leave empty.
            // If dateRange.start is set, we could show that. But for now leave empty if no data.
        }

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

        return { metrics: newMetrics, dailyData: newDaily, growthData, events: filteredEvents };
    }, [metrics, dailyData, events, dateRange]);

    // Share Functionality
    const shareRef = useRef<HTMLDivElement>(null);

    const shareData: ShareableBoardData = useMemo(() => {
        const m = displayData.metrics;
        const d = displayData.dailyData;
        const growth = displayData.growthData;

        // Calculations (Mirroring StatsCards)
        const netTotal = parseFloat(m?.netSinceT0 || "0");
        const initial = parseFloat(m?.initialBalance || "0");
        const growthPct = initial > 0 ? (netTotal / initial) : 0;

        const wins = m?.winCount || 0;
        const losses = m?.lossCount || 0;
        const totalTrades = wins + losses;
        const winRate = totalTrades > 0 ? wins / totalTrades : 0;

        const sharpe = calculateSharpe(d);
        const maxDD = calculateMaxDrawdown(d, initial);

        const days = d.length;
        const cdgr = days > 0 ? (Math.pow(1 + growthPct, 1 / days) - 1) : 0;

        const proj30 = Math.pow(1 + cdgr, 30) - 1;
        const projAnn = Math.pow(1 + cdgr, 365) - 1;

        const r = 0.001;
        let pctPerWin = 0;
        if (wins > 0) {
            pctPerWin = Math.pow((1 + growthPct) / Math.pow(1 - r, losses), 1 / wins) - 1;
        }

        const edge = totalTrades > 0 ? (Math.pow(1 + growthPct, 1 / totalTrades) - 1) : 0;

        // Colors (Hex for html2canvas compatibility)
        const GREEN = "#4ade80";
        const RED = "#f87171";
        const YELLOW = "#facc15";
        const BLUE = "#60a5fa";
        const GRAY = "#9ca3af";
        const sign = netTotal >= 0 ? "+" : "-";

        return {
            pnlStr: `${sign}${formatCurrency(Math.abs(netTotal))} (${sign}${formatPercent(Math.abs(growthPct))})`,
            pnlColor: netTotal >= 0 ? GREEN : RED,

            winRateStr: formatPercent(winRate),
            winRateColor: winRate >= 0.5 ? GREEN : YELLOW,
            winLossSub: `(${wins}W / ${losses}L)`,

            sharpe: sharpe.toFixed(2),
            sharpeColor: sharpe > 1 ? GREEN : sharpe > 0 ? BLUE : GRAY,

            maxDD: "-" + formatPercent(maxDD),
            maxDDColor: maxDD > 0.1 ? RED : maxDD > 0 ? YELLOW : GRAY,

            cdgr: formatPercent(cdgr),
            cdgrColor: cdgr > 0 ? GREEN : cdgr < 0 ? RED : GRAY,

            proj30: formatPercent(proj30),
            proj30Color: proj30 > 0 ? GREEN : proj30 < 0 ? RED : GRAY,

            projAnn: formatPercent(projAnn),
            projAnnColor: projAnn > 0 ? GREEN : projAnn < 0 ? RED : GRAY,

            pctPerWin: formatPercent(pctPerWin),
            pctPerWinColor: pctPerWin > 0 ? GREEN : pctPerWin < 0 ? RED : GRAY,

            edge: new Intl.NumberFormat('en-US', { style: 'percent', minimumSignificantDigits: 4, maximumSignificantDigits: 4 }).format(edge),
            edgeColor: edge > 0 ? GREEN : edge < 0 ? RED : GRAY,

            growthData: growth
        };
    }, [displayData]);

    const handleShare = async () => {
        if (!shareRef.current) return;
        try {
            const canvas = await html2canvas(shareRef.current, {
                backgroundColor: "#02040a",
                scale: 2, // High res
                useCORS: true,
                logging: false,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.querySelector("[data-share-board]") as HTMLElement;
                    if (el) el.style.display = "block";
                }
            });
            const link = document.createElement("a");
            link.download = `performance-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (e: any) {
            console.error("Share failed", e);
            alert("Failed to generate image: " + (e.message || e));
        }
    };

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
                onShare={handleShare}
            />

            <main className="mx-auto max-w-7xl space-y-6 p-6">
                {/* Top Stats */}
                <StatsCards metrics={displayData.metrics} dailyData={displayData.dailyData} />

                {/* Growth Chart */}
                <GrowthChart data={displayData.growthData} />

                {/* Daily Net Chart & Table */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <PnLChart data={displayData.dailyData} />
                    <ClosedPositionsTable events={displayData.events} />
                </div>
            </main>



            {/* Hidden Shareable Board - Fixed position prevents layout shift and culling issues */}
            <div className="fixed top-0 left-[-9999px] overflow-hidden">
                <div data-share-board>
                    <ShareableBoard ref={shareRef} data={shareData} />
                </div>
            </div>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentRange={dateRange}
                onApply={handleApplySettings}
            />
        </div>
    );
}

// ----------------------------------------------------------------------
// Helper functions for stats calculation (Moved/Copied from StatsCards for ShareData)
// ----------------------------------------------------------------------
function calculateSharpe(dailyData: DailyMetrics[]): number {
    if (dailyData.length < 2) return 0;
    const values = dailyData.map(d => parseFloat(d.net || "0"));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return (mean / stdDev) * Math.sqrt(365);
}

function calculateMaxDrawdown(dailyData: DailyMetrics[], initialBalance: number): number {
    if (dailyData.length < 2) return 0;
    let cumulative = initialBalance;
    let peak = initialBalance;
    let maxDD = 0;
    for (const d of dailyData) {
        // Use balance if available or cumulative net?
        // StatsCards uses: const bal = d.balance ? parseFloat(d.balance) : (cumulative += parseFloat(d.net));
        // We must perform exact same logic.
        const val = parseFloat(d.net || "0");
        const bal = d.balance ? parseFloat(d.balance) : (cumulative += val);

        if (bal > peak) peak = bal;
        const dd = peak > 0 ? (peak - bal) / peak : 0;
        if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
}

function formatCurrency(val: number) {
    if (isNaN(val)) return "$0.00";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function formatPercent(val: number) {
    if (isNaN(val)) return "0.00%";
    return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(val);
}
