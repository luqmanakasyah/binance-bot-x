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
    initialBalance: string;
    winCount: number;
    lossCount: number;
}

export interface LedgerEvent {
    eventId: string;
    tsMs: number;
    incomeType: string;
    asset: string;
    amount: string;
    symbol?: string;
}

export interface DailyMetrics {
    date: string;
    net: string;
    realisedPnl: string;
    funding: string;
    commission: string;
    transfer: string;
    other: string;
    count: number;
    updatedAt: number;
}
