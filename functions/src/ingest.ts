import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Decimal } from "decimal.js"; // IMPORT ADDED
import { binanceRequest } from "./binance";
import { generateEventId, classifyIncome, toDecimal, fmtDec, zeroDailyMetrics } from "./utils";
import { HistState, LedgerEvent, DailyMetrics, LiveMetrics } from "./types";

const db = admin.firestore();

export const refreshIncomeHandler = async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    // 1. Get lock/state
    const histRef = db.collection("hist_state").doc("main");
    const histDoc = await histRef.get();
    if (!histDoc.exists) {
        throw new functions.https.HttpsError("failed-precondition", "State not initialized. Run initBaseline first.");
    }
    const state = histDoc.data() as HistState;

    // 2. Determine time range
    const now = Date.now();
    const SAFE_BUFFER_MS = 10 * 60 * 1000;
    const startTime = Math.max(state.t0Ms - SAFE_BUFFER_MS, state.cursorMs - SAFE_BUFFER_MS);

    let fetchedEvents: any[] = [];
    let currentStartTime = startTime;
    const endTime = now;
    let hasMore = true;

    let loops = 0;
    while (hasMore && loops < 20) {
        loops++;
        try {
            const resp = await binanceRequest("/fapi/v1/income", "GET", {
                startTime: currentStartTime,
                endTime: endTime,
                limit: 1000
            });

            if (!Array.isArray(resp) || resp.length === 0) {
                hasMore = false;
                break;
            }

            fetchedEvents = fetchedEvents.concat(resp);

            const last = resp[resp.length - 1];
            if (resp.length === 1000) {
                currentStartTime = last.time + 1;
                if (currentStartTime > endTime) hasMore = false;
            } else {
                hasMore = false;
            }
        } catch (e: any) {
            console.error("Error fetching income:", e);
            throw new functions.https.HttpsError("internal", "Binance fetch failed");
        }
    }

    const usdtEvents = fetchedEvents.filter((e: any) => e.asset === "USDT");

    if (usdtEvents.length === 0) {
        return { message: "No new events", count: 0 };
    }

    // Deduplication
    const existingSnaps = await db.collection("ledger_events")
        .where("tsMs", ">=", startTime)
        .select("eventId")
        .get();

    const existingIds = new Set(existingSnaps.docs.map(d => d.id));
    const newEvents = usdtEvents.filter(r => !existingIds.has(generateEventId(r)));

    let maxTs = state.cursorMs;
    for (const raw of usdtEvents) {
        if (raw.time > maxTs) maxTs = raw.time;
    }

    if (newEvents.length === 0) {
        await histRef.update({
            cursorMs: maxTs,
            lastUpdatedAt: Date.now()
        });
        return { message: "No new events (duplicates skipped)", count: 0 };
    }

    const batch = db.batch();
    let opCount = 0;

    // Prepare batch for Ledger Events
    const dateUpdates: Record<string, any> = {};

    for (const raw of newEvents) {
        const eventId = generateEventId(raw);
        const tsMs = raw.time;
        const bucket = classifyIncome(raw.incomeType);

        // Upsert
        const docRef = db.collection("ledger_events").doc(eventId);
        const record: LedgerEvent = {
            eventId,
            tsMs,
            incomeType: raw.incomeType,
            asset: "USDT",
            amount: raw.income,
            symbol: raw.symbol,
            tranId: raw.tranId,
            raw: raw,
            createdAt: Date.now()
        };

        batch.set(docRef, record);
        opCount++;

        // Aggregation logic prep
        const dateKey = new Date(tsMs).toISOString().split("T")[0];
        const amt = toDecimal(raw.income);

        if (!dateUpdates[dateKey]) {
            dateUpdates[dateKey] = {
                net: new Decimal(0),
                realisedPnl: new Decimal(0),
                funding: new Decimal(0),
                commission: new Decimal(0),
                transfer: new Decimal(0),
                other: new Decimal(0),
                count: 0
            };
        }

        const u = dateUpdates[dateKey];
        u.net = u.net.plus(amt);
        u.count++;

        if (bucket === 'realisedPnl') u.realisedPnl = u.realisedPnl.plus(amt);
        else if (bucket === 'funding') u.funding = u.funding.plus(amt);
        else if (bucket === 'commission') u.commission = u.commission.plus(amt);
        else if (bucket === 'transfer') u.transfer = u.transfer.plus(amt);
        else u.other = u.other.plus(amt);
    }

    await batch.commit();

    // Transaction for Aggregates + Cursor
    const dates = Object.keys(dateUpdates);

    await db.runTransaction(async (t) => {
        const dailyRefs = dates.map(d => db.collection("daily").doc(d));
        let dailySnaps: admin.firestore.DocumentSnapshot[] = [];
        if (dailyRefs.length > 0) {
            dailySnaps = await t.getAll(...dailyRefs);
        }

        for (let i = 0; i < dailySnaps.length; i++) {
            const dDoc = dailySnaps[i];
            const date = dates[i];
            const update = dateUpdates[date];

            let current: DailyMetrics;
            if (!dDoc.exists) {
                current = zeroDailyMetrics(date);
            } else {
                current = dDoc.data() as DailyMetrics;
            }

            const next: DailyMetrics = {
                ...current,
                updatedAt: Date.now(),
                net: fmtDec(toDecimal(current.net).plus(update.net)),
                realisedPnl: fmtDec(toDecimal(current.realisedPnl).plus(update.realisedPnl)),
                funding: fmtDec(toDecimal(current.funding).plus(update.funding)),
                commission: fmtDec(toDecimal(current.commission).plus(update.commission)),
                transfer: fmtDec(toDecimal(current.transfer).plus(update.transfer)),
                other: fmtDec(toDecimal(current.other).plus(update.other)),
                count: current.count + update.count
            };

            t.set(dDoc.ref, next);
        }

        t.update(histRef, {
            cursorMs: maxTs,
            lastUpdatedAt: Date.now(),
            lastRunSummary: {
                newEvents: newEvents.length,
                fetchedFromMs: startTime,
                fetchedToMs: endTime
            }
        });
    });

    await updateLiveMetrics(state.t0Ms);

    // Recalculate balances to ensure we have snapshots
    await recalcDailyBalances();

    return { newEvents: newEvents.length, newCursorMs: maxTs };
};

export async function recalcDailyBalances() {
    // 1. Get Init Baseline
    const histSnap = await db.collection("hist_state").doc("main").get();
    if (!histSnap.exists) return;
    const baseline = toDecimal((histSnap.data() as HistState).baselineWalletBalanceUSDT || "0");

    // 2. Get All Daily Docs (ASC)
    const dailySnaps = await db.collection("daily").orderBy("date", "asc").get();

    let prevBalance = baseline;
    let runningBalance = baseline;
    const batch = db.batch();

    dailySnaps.forEach(doc => {
        const data = doc.data() as DailyMetrics;
        const net = toDecimal(data.net);
        runningBalance = runningBalance.plus(net);

        // Calculate percentage change from previous day's balance
        let pctChange = new Decimal(0);
        if (!prevBalance.isZero()) {
            pctChange = runningBalance.minus(prevBalance).dividedBy(prevBalance);
        }

        // Update doc with balance and pctChange
        batch.update(doc.ref, {
            balance: fmtDec(runningBalance),
            pctChange: fmtDec(pctChange)
        });

        // Update prevBalance for next iteration
        prevBalance = runningBalance;
    });

    await batch.commit();
}

async function updateLiveMetrics(t0Ms: number) {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const todayRef = db.collection("daily").doc(today);
    const todaySnap = await todayRef.get();
    const zero = zeroDailyMetrics(today);
    const dToday = todaySnap.exists ? (todaySnap.data() as DailyMetrics) : zero;

    // 7d calculation
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateStr = sevenDaysAgo.toISOString().split("T")[0];

    const weekSnaps = await db.collection("daily")
        .where("date", ">=", dateStr)
        .get();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let d7: any = { net: new Decimal(0), realisedPnl: new Decimal(0), funding: new Decimal(0), commission: new Decimal(0), transfer: new Decimal(0) };

    const allSnaps = await db.collection("daily").select("net").get();
    let netSinceT0 = new Decimal(0);
    allSnaps.forEach(d => {
        const val = toDecimal(d.data().net || "0");
        netSinceT0 = netSinceT0.plus(val);
    });

    weekSnaps.forEach(d => {
        const data = d.data() as DailyMetrics;
        d7.net = d7.net.plus(toDecimal(data.net));
        d7.realisedPnl = d7.realisedPnl.plus(toDecimal(data.realisedPnl));
        d7.funding = d7.funding.plus(toDecimal(data.funding));
        d7.commission = d7.commission.plus(toDecimal(data.commission));
        d7.transfer = d7.transfer.plus(toDecimal(data.transfer));
    });

    const live: LiveMetrics = {
        trackingSinceMs: t0Ms,
        lastUpdatedAt: Date.now(),
        netSinceT0: fmtDec(netSinceT0),
        netToday: dToday.net,
        net7d: fmtDec(d7.net),
        realisedPnlToday: dToday.realisedPnl,
        fundingToday: dToday.funding,
        commissionToday: dToday.commission,
        transferToday: dToday.transfer,
        realisedPnl7d: fmtDec(d7.realisedPnl),
        funding7d: fmtDec(d7.funding),
        commission7d: fmtDec(d7.commission),
        transfer7d: fmtDec(d7.transfer),
        initialBalance: "0", // Will be filled below
        winCount: 0,
        lossCount: 0
    };

    // Fill initialBalance from hist_state
    const histSnap = await db.collection("hist_state").doc("main").get();
    if (histSnap.exists) {
        live.initialBalance = (histSnap.data() as HistState).baselineWalletBalanceUSDT || "0";
    }

    // Win/Loss Calculation (Aggregate from all ledger events with grouping)
    const allPnlSnaps = await db.collection("ledger_events")
        .where("incomeType", "==", "REALIZED_PNL")
        .get();

    const usageMap: Record<string, number> = {};

    allPnlSnaps.forEach(d => {
        const data = d.data();
        const key = `${data.symbol}_${data.tsMs}`;
        const val = parseFloat(data.amount);
        usageMap[key] = (usageMap[key] || 0) + val;
    });

    let w = 0;
    let l = 0;
    Object.values(usageMap).forEach(netPnl => {
        if (netPnl > 0) w++;
        else l++;
    });

    live.winCount = w;
    live.lossCount = l;

    await db.collection("metrics_live").doc("current").set(live);
}
