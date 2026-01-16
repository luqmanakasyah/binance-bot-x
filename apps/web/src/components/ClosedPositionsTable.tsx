
import { LedgerEvent } from "@/types";
import { useMemo } from "react";

function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function formatDate(ms: number) {
    return new Date(ms).toLocaleString();
}

interface ClosedPosition {
    id: string; // symbol_time
    symbol: string;
    closeTime: number;
    pnl: number;
    commission: number;
    // Funding is usually separate in time, so hard to link exactly to close without position ID
    // Duration is hard to determine without finding the matching Open
}

export function ClosedPositionsTable({ events }: { events: LedgerEvent[] }) {
    const positions = useMemo(() => {
        // Group by Symbol + Time (to handle split fills and link close-commission)
        const groups: Record<string, ClosedPosition> = {};

        events.forEach(e => {
            if (!e.symbol) return;
            // Use 1-minute bucket or exact timestamp? 
            // Split fills usually same MS.
            const key = `${e.symbol}_${e.tsMs}`;

            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    symbol: e.symbol,
                    closeTime: e.tsMs,
                    pnl: 0,
                    commission: 0
                };
            }

            const val = parseFloat(e.amount);
            if (e.incomeType === "REALIZED_PNL") {
                groups[key].pnl += val;
            } else if (e.incomeType === "COMMISSION") {
                groups[key].commission += val; // Commission is negative
            }
        });

        // Filter for groups that actually have PnL (Open positions/Pure Funding/Transfer are ignored)
        // Also we want to convert the map to array
        const list = Object.values(groups).filter(g => Math.abs(g.pnl) > 0); // Only significant PnL

        // Sort by time desc
        return list.sort((a, b) => b.closeTime - a.closeTime);
    }, [events]);

    return (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-4 text-base font-semibold text-gray-200">Recent Closed Positions</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="border-b border-gray-800 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Symbol</th>
                            <th className="px-4 py-3 text-right">Realised PnL</th>
                            <th className="px-4 py-3 text-right">Close Fees</th>
                            <th className="px-4 py-3 text-right">Duration</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {positions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-4 text-center text-gray-600">
                                    No closed positions found in recent events.
                                </td>
                            </tr>
                        ) : (
                            positions.map((pos) => (
                                <tr key={pos.id} className="hover:bg-gray-800/50">
                                    <td className="px-4 py-3">{formatDate(pos.closeTime)}</td>
                                    <td className="px-4 py-3 font-medium text-white">{pos.symbol}</td>
                                    <td className={`px-4 py-3 text-right font-medium ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {pos.pnl > 0 ? "+" : ""}{formatCurrency(pos.pnl)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-red-300">
                                        {formatCurrency(pos.commission)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600">
                                        —
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <p className="mt-2 text-xs text-gray-600">
                * Duration and Open-Fees are not currently tracked. Fees shown are closing commissions.
            </p>
        </div>
    );
}
