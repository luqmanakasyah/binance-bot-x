
"use client";

import { useState } from "react";

interface DateRange {
    start: number | null; // ms timestamp
    end: number | null;
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentRange: DateRange;
    onApply: (range: DateRange) => void;
}

export function SettingsModal({ isOpen, onClose, currentRange, onApply }: SettingsModalProps) {
    // Helpers to convert timestamp -> UTC Date string (YYYY-MM-DD)
    const toUTCString = (ms: number | null) => {
        if (!ms) return "";
        // toISOString() is always UTC: "2026-01-17T..."
        return new Date(ms).toISOString().slice(0, 10);
    };

    const [startStr, setStartStr] = useState(toUTCString(currentRange.start));
    const [endStr, setEndStr] = useState(toUTCString(currentRange.end));

    if (!isOpen) return null;

    const handleSave = () => {
        const parseUTC = (str: string, isEnd: boolean) => {
            if (!str) return null;
            // Force UTC midnight
            // "2026-01-17" -> "2026-01-17T00:00:00.000Z" (Start)
            // "2026-01-17" -> "2026-01-17T23:59:59.999Z" (End)

            const dateStr = isEnd ? `${str}T23:59:59.999Z` : `${str}T00:00:00.000Z`;
            const ms = new Date(dateStr).getTime();
            return isNaN(ms) ? null : ms;
        };

        const s = parseUTC(startStr, false);
        const e = parseUTC(endStr, true);

        onApply({ start: s, end: e });
        onClose();
    };

    const handleClear = () => {
        onApply({ start: null, end: null });
        onClose();
    };

    // Display helper: Convert YYYY-MM-DD -> DD-MMM-YYYY
    const formatDisplay = (isoDate: string) => {
        if (!isoDate) return "";
        try {
            // isoDate is YYYY-MM-DD. We want to treat it as UTC or just parse components.
            // new Date("2026-01-17") is UTC usually.
            const d = new Date(isoDate);
            if (isNaN(d.getTime())) return "";
            return d.toUTCString().split(' ').slice(1, 4).join('-');
        } catch (e) {
            return "";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm sm:max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
                <h2 className="mb-4 text-xl font-bold text-white">Dashboard Settings</h2>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Start Date (UTC)</label>
                        <input
                            type="date"
                            className="w-full appearance-none rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-base text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none [color-scheme:dark]"
                            value={startStr}
                            onChange={(e) => setStartStr(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">End Date (UTC)</label>
                        <input
                            type="date"
                            className="w-full appearance-none rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-base text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none [color-scheme:dark]"
                            value={endStr}
                            onChange={(e) => setEndStr(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">Leave empty to include up to now.</p>
                    </div>
                </div>

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        onClick={onClose}
                        className="w-full rounded-lg border border-gray-700 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800 sm:w-auto sm:py-2"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleClear}
                        className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-gray-400 hover:text-white sm:w-auto sm:py-2"
                    >
                        Reset Defaults
                    </button>
                    <button
                        onClick={handleSave}
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 sm:w-auto sm:py-2"
                    >
                        Apply Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
