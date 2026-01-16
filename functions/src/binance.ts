import axios from "axios";
import * as crypto from "crypto";
import * as functions from "firebase-functions";

// Get secrets from environment config
// We assume they are set via: firebase functions:config:set binance.key="..." binance.secret="..."
// OR via defineSecret if using 2nd gen functions, but we are using 1st gen for simplicity unless specified.
// User didn't specify generation, but 1st gen is default in many guides.
// However, the prompt mentions `Node.js 20` which supports 2nd gen better. 
// Let's use `process.env` or `functions.config()`.
// For better security, secrets should be used.
// Prompt said: Use server timestamps and Cloud Functions secrets.

// We will assume these are available as secrets `BINANCE_API_KEY` and `BINANCE_API_SECRET` 
// mapped to process.env by the user or accessed via defineSecret. 
// For this code to run, we'll try to use process.env first.

const BASE_URL_TS = "https://fapi.binance.com";
const TIMEOUT = 10000;

const getApiKey = () => process.env.BINANCE_API_KEY || functions.config().binance?.key || "";
const getApiSecret = () => process.env.BINANCE_API_SECRET || functions.config().binance?.secret || "";

export const signRequest = (queryString: string, apiSecret: string): string => {
    return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex");
};

export const binanceRequest = async (
    endpoint: string,
    method: "GET" | "POST",
    params: Record<string, string | number> = {}
) => {
    const apiKey = getApiKey();
    const apiSecret = getApiSecret();

    if (!apiKey || !apiSecret) {
        throw new Error("Missing Binance API Key or Secret");
    }

    const cleanParams: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) cleanParams[k] = v;
    }

    // Add timestamp
    cleanParams["timestamp"] = Date.now();
    cleanParams["recvWindow"] = 20000; // Generous window

    const queryString = Object.keys(cleanParams)
        .map((key) => `${key}=${encodeURIComponent(cleanParams[key])}`)
        .join("&");

    const signature = signRequest(queryString, apiSecret);
    const fullQuery = `${queryString}&signature=${signature}`;

    try {
        const response = await axios({
            method,
            url: `${BASE_URL_TS}${endpoint}?${fullQuery}`,
            headers: {
                "X-MBX-APIKEY": apiKey,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: TIMEOUT,
        });
        return response.data;
    } catch (error: any) {
        if (error.response) {
            console.error("Binance API Error:", error.response.status, error.response.data);
            if (error.response.status === 429) {
                throw new Error("RateLimitExceeded");
            }
        }
        throw error;
    }
};
