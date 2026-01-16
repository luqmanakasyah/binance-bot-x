"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { cn } from "@/lib/utils";

interface HeaderProps {
    lastUpdated?: number;
    trackingSince?: number;
}

export function DashboardHeader({ lastUpdated, trackingSince }: HeaderProps) {
    const [loading, setLoading] = useState(false);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            // 1. Check if init is needed (or just call refresh and handle error?)
            // User said: "On first run, initialise... On dashboard, clicking Refresh triggers... Update"
            // We'll call refreshIncomeSinceCursor.
            const refreshFn = httpsCallable(functions, "refreshIncomeSinceCursor");
            await refreshFn();
        } catch (e: any) {
            console.error(e);
            alert("Refresh failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInit = async () => {
        setLoading(true);
        try {
            const initFn = httpsCallable(functions, "initBaseline");
            await initFn();
            alert("Initialized!");
        } catch (e: any) {
            alert("Init failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 border-b border-gray-800 bg-gray-900 p-6 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-2xl font-bold text-white">Binance Futures PnL</h1>
                <div className="flex gap-4 text-sm text-gray-400">
                    <span>Tracking since: {trackingSince ? new Date(trackingSince).toLocaleDateString() : "--"}</span>
                    <span>Last update: {lastUpdated ? new Date(lastUpdated).toLocaleString() : "--"}</span>
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={handleInit}
                    disabled={loading}
                    className="rounded border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                    Init (First Run)
                </button>
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className={cn(
                        "flex items-center gap-2 rounded bg-yellow-500 px-4 py-2 font-semibold text-black hover:bg-yellow-400 disabled:opacity-50",
                        loading && "cursor-not-allowed"
                    )}
                >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    {loading ? "Syncing..." : "Refresh"}
                </button>
            </div>
        </div>
    );
}
