export interface LedgerEvent {
    eventId: string;
    tsMs: number;
    incomeType: string;
    asset: string;
    amount: string;
    symbol?: string;
    tranId?: string | number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw: any;
    createdAt: number; // Timestamp ms
}

export interface HistState {
    t0Ms: number;
    cursorMs: number;
    baselineWalletBalanceUSDT: string;
    lastUpdatedAt: number; // Timestamp ms
    lastRunSummary?: {
        newEvents: number;
        fetchedFromMs: number;
        fetchedToMs: number;
    };
}

export interface DailyMetrics {
    date: string; // YYYY-MM-DD
    net: string;
    realisedPnl: string;
    funding: string;
    commission: string;
    transfer: string;
    other: string;
    count: number;
    updatedAt: number;
}

export interface LiveMetrics {
    trackingSinceMs: number;
    lastUpdatedAt: number;
    netSinceT0: string;
    netToday: string;
    net7d: string;
    realisedPnlToday: string;
    fundingToday: string;
    commissionToday: string;
    transferToday: string;
    realisedPnl7d: string;
    funding7d: string;
    commission7d: string;
    transfer7d: string;
}

export type IncomeBucket = 'realisedPnl' | 'funding' | 'commission' | 'transfer' | 'other';
