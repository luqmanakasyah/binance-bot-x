import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { binanceRequest } from "./binance";
import { HistState, LiveMetrics } from "./types";

const db = admin.firestore();

export const initBaselineHandler = async (data: any, context: functions.https.CallableContext) => {
    // Ensure authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const histRef = db.collection("hist_state").doc("main");
    const doc = await histRef.get();

    if (doc.exists) {
        return { status: "already_initialized", data: doc.data() };
    }

    const t0Ms = Date.now();

    functions.logger.info("Init: Fetching Binance User Account...");
    // Fetch account balance
    let balance = "0";
    try {
        const accountData = await binanceRequest("/fapi/v2/account", "GET", {});
        functions.logger.info("Init: Binance response received.", { data: JSON.stringify(accountData).slice(0, 100) });
        const usdtAsset = accountData.assets.find((a: any) => a.asset === "USDT");
        if (usdtAsset) {
            balance = usdtAsset.walletBalance; // this is string
        }
    } catch (e: any) {
        functions.logger.error("Failed to fetch balance", e);
        throw new functions.https.HttpsError("internal", "Failed to fetch Binance account data: " + e.message);
    }

    const newState: HistState = {
        t0Ms,
        cursorMs: t0Ms - 10 * 60 * 1000, // 10 mins buffer
        baselineWalletBalanceUSDT: balance,
        lastUpdatedAt: Date.now(),
    };

    functions.logger.info("Init: Writing state to Firestore...", { state: newState });

    const initialMetrics: LiveMetrics = {
        trackingSinceMs: t0Ms,
        lastUpdatedAt: Date.now(),
        netSinceT0: "0",
        netToday: "0",
        net7d: "0",
        realisedPnlToday: "0",
        fundingToday: "0",
        commissionToday: "0",
        transferToday: "0",
        realisedPnl7d: "0",
        funding7d: "0",
        commission7d: "0",
        transferToday: "0",
        realisedPnl7d: "0",
        funding7d: "0",
        commission7d: "0",
        transfer7d: "0",
        initialBalance: balance, // Capture initial balance
        winCount: 0,
        lossCount: 0
    };

    const batch = db.batch();
    batch.set(histRef, newState);
    batch.set(db.collection("metrics_live").doc("current"), initialMetrics);

    // Debug info
    const debugInfo = {
        projectId: process.env.GCLOUD_PROJECT || "unknown",
        databaseId: (db as any).databaseId || "(default?)",
        path: histRef.path
    };
    functions.logger.info("Init: db info", debugInfo);

    await batch.commit();
    functions.logger.info("Init: Write successful.");

    // Read back to verify
    const check = await histRef.get();
    if (!check.exists) {
        functions.logger.error("Init: IMMEDIATE READ BACK FAILED!");
        throw new functions.https.HttpsError("internal", "Write appeared to succeed but document is missing.");
    }

    return { status: "initialized", data: newState, debug: debugInfo, verified: true };
};
