"use client";

import { useState } from "react";
import { RefreshCw, Settings, Share2 } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { cn } from "@/lib/utils";

interface HeaderProps {
    lastUpdated?: number;
    trackingSince?: number;
    onOpenSettings?: () => void;
    isFilterActive?: boolean;
    onShare?: () => void;
}

export function DashboardHeader({ onOpenSettings, isFilterActive, onShare }: HeaderProps) {
    const [loading, setLoading] = useState(false);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const refreshFn = httpsCallable(functions, "refreshIncomeSinceCursor");
            await refreshFn();
        } catch (e: any) {
            console.error(e);
            alert("Refresh failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Performance</h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Refresh Data"
                        className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white disabled:opacity-50",
                            loading && "cursor-not-allowed"
                        )}
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </button>

                    <button
                        onClick={onShare}
                        title="Share Dashboard"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white"
                    >
                        <Share2 className="h-4 w-4" />
                    </button>


                    <button
                        onClick={onOpenSettings}
                        title="Settings / Filter"
                        className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white relative",
                            isFilterActive && "border-blue-500/50 bg-blue-500/10 text-blue-400"
                        )}
                    >
                        <Settings className="h-4 w-4" />
                        {isFilterActive && (
                            <span className="absolute -right-1 -top-1 flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500"></span>
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}
