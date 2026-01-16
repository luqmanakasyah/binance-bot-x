import { LedgerEvent } from "@/types";

export function ActivityTable({ events }: { events: LedgerEvent[] }) {
    return (
        <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
            <div className="border-b border-gray-800 px-6 py-4">
                <h3 className="font-semibold text-white">Recent Ledger Events</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-800/50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Symbol</th>
                            <th className="px-6 py-3 text-right">Amount (USDT)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {events.map((e) => {
                            const amt = parseFloat(e.amount);
                            return (
                                <tr key={e.eventId} className="hover:bg-gray-800/30">
                                    <td className="px-6 py-4">{new Date(e.tsMs).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-white">{e.incomeType}</td>
                                    <td className="px-6 py-4">{e.symbol || "-"}</td>
                                    <td className={`px-6 py-4 text-right font-mono ${amt >= 0 ? "text-green-400" : "text-red-400"}`}>
                                        {amt.toFixed(4)}
                                    </td>
                                </tr>
                            );
                        })}
                        {events.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-6 text-center text-gray-500">No events found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
