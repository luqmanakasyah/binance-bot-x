import { LiveMetrics } from "@/types";

function formatCurrency(val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

export function StatsCards({ metrics }: { metrics?: LiveMetrics }) {
    const netTotal = parseFloat(metrics?.netSinceT0 || "0");
    const netToday = parseFloat(metrics?.netToday || "0");
    const net7d = parseFloat(metrics?.net7d || "0");

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card title="Total Net (Since T0)" value={netTotal} />
            <Card title="Net Today" value={netToday} />
            <Card title="Net Last 7 Days" value={net7d} />
        </div>
    );
}

function Card({ title, value }: { title: string, value: number }) {
    const isPos = value >= 0;
    return (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-sm font-medium text-gray-400">{title}</h3>
            <div className={`mt-2 text-3xl font-bold ${isPos ? "text-green-400" : "text-red-400"}`}>
                {value > 0 ? "+" : ""}{formatCurrency(value.toString())}
            </div>
        </div>
    );
}
