import { Decimal } from "decimal.js";
import * as crypto from "crypto";
import { IncomeBucket } from "./types";

export const toDecimal = (val: string | number): Decimal => new Decimal(val);

export const fmtDec = (d: Decimal): string => d.toString();

/**
 * Classifies income type into buckets.
 */
export const classifyIncome = (incomeType: string): IncomeBucket => {
    const t = incomeType.toUpperCase();
    if (t === "REALIZED_PNL") return "realisedPnl";
    if (t === "FUNDING_FEE") return "funding";
    if (t === "COMMISSION") return "commission";
    if (t === "TRANSFER") return "transfer";
    return "other";
};

/**
 * Generates deterministic eventId.
 * eventId = sha256(tsMs + "|" + incomeType + "|" + asset + "|" + amount + "|" + (tranId||"") + "|" + (symbol||""))
 */
export const generateEventId = (raw: any): string => {
    const parts = [
        raw.time,
        raw.incomeType,
        raw.asset,
        raw.income, // amount
        raw.tranId || "",
        raw.symbol || ""
    ];
    return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
};

/**
 * Helper to zero out a metrics object
 */
export const zeroDailyMetrics = (date: string) => ({
    date,
    net: "0",
    realisedPnl: "0",
    funding: "0",
    commission: "0",
    transfer: "0",
    other: "0",
    count: 0,
    updatedAt: Date.now()
});
