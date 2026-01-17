
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
    // Helpers to convert timestamp -> SGT string for input
    const toSGTString = (ms: number | null) => {
        if (!ms) return "";
        // Offset +8h manually to get YYYY-MM-DDThh:mm string relative to UTC
        // But Input datetime-local expects local time of the browser usually, OR strictly formatted string.
        // If user says "SGT", we must treat input as SGT.
        // Easiest: Parse string as ISO with +08:00 offset.

        // Display: Convert UTC ms to SGT components
        const d = new Date(ms + 8 * 3600 * 1000);
        return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    };

    const [startStr, setStartStr] = useState(toSGTString(currentRange.start));
    const [endStr, setEndStr] = useState(toSGTString(currentRange.end));

    if (!isOpen) return null;

    const handleSave = () => {
        const parseSGT = (str: string) => {
            if (!str) return null;
            // Append +08:00 if standard ISO
            return new Date(`${str}:00+08:00`).getTime();
        };

        const s = parseSGT(startStr);
        const e = parseSGT(endStr);

        onApply({ start: s, end: e });
        onClose();
    };

    const handleClear = () => {
        onApply({ start: null, end: null });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
                <h2 className="mb-4 text-xl font-bold text-white">Dashboard Settings</h2>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Start Date (SGT)</label>
                        <input
                            type="datetime-local"
                            className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                            value={startStr}
                            onChange={(e) => setStartStr(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">End Date (SGT)</label>
                        <input
                            type="datetime-local"
                            className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                            value={endStr}
                            onChange={(e) => setEndStr(e.target.value)}
                        />
                        <p className="text-xs text-gray-600">Leave empty to include up to now.</p>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button
                        onClick={handleClear}
                        className="rounded px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
                    >
                        Reset to All Time
                    </button>
                    <button
                        onClick={handleSave}
                        className="rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
                    >
                        Apply Filter
                    </button>
                    <button
                        onClick={onClose}
                        className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
