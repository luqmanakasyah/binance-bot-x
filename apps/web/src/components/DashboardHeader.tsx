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
            </div >
        </div >
    );
}
