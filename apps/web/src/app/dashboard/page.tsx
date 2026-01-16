"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StatsCards } from "@/components/StatsCards";
import { BreakdownGrid } from "@/components/BreakdownGrid";
import { PnLChart } from "@/components/PnLChart";
import { ActivityTable } from "@/components/ActivityTable";
import { DailyMetrics, LedgerEvent, LiveMetrics } from "@/types";

export default function DashboardPage() {
    const router = useRouter();
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [metrics, setMetrics] = useState<LiveMetrics | undefined>(undefined);
    const [dailyData, setDailyData] = useState<DailyMetrics[]>([]);
    const [events, setEvents] = useState<LedgerEvent[]>([]);

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

        // 3. Ledger Events Listener (Last 50)
        const qLedger = query(collection(db, "ledger_events"), orderBy("tsMs", "desc"), limit(50));
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
                lastUpdated={metrics?.lastUpdatedAt}
                trackingSince={metrics?.trackingSinceMs}
            />

            <main className="mx-auto max-w-7xl space-y-6 p-6">
                {/* Top Stats */}
                <StatsCards metrics={metrics} dailyData={dailyData} />

                {/* Breakdowns */}
                <BreakdownGrid metrics={metrics} />

                {/* Chart & Table */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <PnLChart data={dailyData} />
                    <ActivityTable events={events} />
                </div>
            </main>
        </div>
    );
}
