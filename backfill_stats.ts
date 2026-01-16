
import admin from 'firebase-admin';

admin.initializeApp({
    projectId: 'binance-bot-x'
});

const db = admin.firestore();

async function main() {
    try {
        console.log("Fetching hist_state...");
        const histSnap = await db.collection("hist_state").doc("main").get();
        if (!histSnap.exists) {
            console.error("No history state found.");
            return;
        }
        const state = histSnap.data();
        const initialDetails = state?.baselineWalletBalanceUSDT || "0";
        console.log("Initial Balance:", initialDetails);

        console.log("Fetching PnL events...");
        const pnlSnaps = await db.collection("ledger_events")
            .where("incomeType", "==", "REALIZED_PNL")
            .get();

        let wins = 0;
        let losses = 0;
        pnlSnaps.forEach(doc => {
            const amt = parseFloat(doc.data().amount);
            if (amt > 0) wins++;
            else losses++;
        });
        console.log(`Wins: ${wins}, Losses: ${losses}`);

        console.log("Updating metrics_live/current...");
        await db.collection("metrics_live").doc("current").set({
            initialBalance: initialDetails,
            winCount: wins,
            lossCount: losses
        }, { merge: true });

        console.log("Update complete.");

    } catch (e) {
        console.error("Error:", e);
    }
}

main();
