
import admin from 'firebase-admin';

// Initialize with application default credentials
admin.initializeApp({
    projectId: 'binance-bot-x'
});

const db = admin.firestore();

async function dumpCollection(name: string) {
    console.log(`\n=== Collection: ${name} ===`);
    const snap = await db.collection(name).get();
    if (snap.empty) {
        console.log("(empty)");
        return;
    }
    snap.docs.forEach(doc => {
        console.log(`\n[Doc ID: ${doc.id}]`);
        console.log(JSON.stringify(doc.data(), null, 2));
    });
}

async function main() {
    try {
        await dumpCollection('metrics_live');
        await dumpCollection('daily');
        await dumpCollection('ledger_events');
        await dumpCollection('hist_state');
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

main();
