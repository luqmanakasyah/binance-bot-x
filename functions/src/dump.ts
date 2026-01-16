import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

export const dumpDataHandler = async (req: functions.https.Request, res: functions.Response) => {
    // Simple security
    if (req.query.key !== "secret-dump-key-1234") {
        res.status(403).send("Unauthorized");
        return;
    }

    const db = admin.firestore();
    const data: any = {};

    try {
        const collections = ["metrics_live", "daily", "ledger_events"];
        for (const colName of collections) {
            const snap = await db.collection(colName).get();
            data[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        res.status(200).json(data);
    } catch (e: any) {
        functions.logger.error("Dump failed", e);
        res.status(500).send(e.message);
    }
};
