import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// Initialize Admin SDK once
admin.initializeApp();

// Export Handlers
import { initBaselineHandler } from "./init";
import { refreshIncomeHandler } from "./ingest";

export const initBaseline = functions.region("asia-southeast1").runWith({}).https.onCall(initBaselineHandler);

export const refreshIncomeSinceCursor = functions.region("asia-southeast1").runWith({
    timeoutSeconds: 540,
    memory: "1GB"
}).https.onCall(refreshIncomeHandler);

import { dumpDataHandler } from "./dump";
export const dumpFirestoreData = functions.region("asia-southeast1").https.onRequest(dumpDataHandler);
