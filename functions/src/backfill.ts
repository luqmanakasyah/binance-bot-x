
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

export const backfillHandler = async (req: functions.https.Request, res: functions.Response) => {
    if (req.query.key !== "secret-backfill-key") {
        res.status(403).send("Unauthorized");
        return;
    }

    const db = admin.firestore();
    try {
        const histSnap = await db.collection("hist_state").doc("main").get();
        if (!histSnap.exists) {
            res.status(404).send("No history state");
            return;
        }
        const state = histSnap.data();
        const initialDetails = state?.baselineWalletBalanceUSDT || "0";

        const pnlSnaps = await db.collection("ledger_events")
            .where("incomeType", "==", "REALIZED_PNL")
            .get();

        const usageMap: Record<string, number> = {};

        pnlSnaps.forEach(doc => {
            const data = doc.data();
            const key = `${data.symbol}_${data.tsMs}`;
            const val = parseFloat(data.amount);
            usageMap[key] = (usageMap[key] || 0) + val;
        });

        let wins = 0;
        let losses = 0;
        Object.values(usageMap).forEach(netPnl => {
            if (netPnl > 0) wins++;
            else losses++;
        });

        await db.collection("metrics_live").doc("current").set({
            initialBalance: initialDetails,
            winCount: wins,
            lossCount: losses
        }, { merge: true });

        res.status(200).json({
            success: true,
            initialBalance: initialDetails,
            wins,
            losses
        });
    } catch (e: any) {
        functions.logger.error("Backfill failed", e);
        res.status(500).send(e.message);
    }
};
