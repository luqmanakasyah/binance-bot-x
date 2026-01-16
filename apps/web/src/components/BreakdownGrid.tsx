import { LiveMetrics } from "@/types";

export function BreakdownGrid({ metrics }: { metrics?: LiveMetrics }) {
    if (!metrics) return null;

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <BreakdownCard title="Today Breakdown"
                realised={metrics.realisedPnlToday}
                funding={metrics.fundingToday}
                comm={metrics.commissionToday}
                transfer={metrics.transferToday}
            />
            <BreakdownCard title="7 Day Breakdown"
                realised={metrics.realisedPnl7d}
                funding={metrics.funding7d}
                comm={metrics.commission7d}
                transfer={metrics.transfer7d}
            />
        </div>
    );
}

function BreakdownCard({ title, realised, funding, comm, transfer }: any) {
    return (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
            <div className="space-y-3">
                <Row label="Realised PnL" value={realised} />
                <Row label="Funding Fees" value={funding} />
                <Row label="Commission" value={comm} />
                <Row label="Transfers" value={transfer} />
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string, value: string }) {
    const num = parseFloat(value || "0");
    const isPos = num >= 0;
    // Commission is usually negative, but if positive implies rebate.
    // Funding can be pos/neg.
    return (
        <div className="flex justify-between border-b border-gray-800 pb-2 last:border-0 last:pb-0">
            <span className="text-gray-400">{label}</span>
            <span className={`font-mono ${isPos ? "text-green-400" : "text-red-400"}`}>
                {num.toFixed(4)}
            </span>
        </div>
    );
}
