"use client";

import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";


export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState("");

    const handleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            router.push("/dashboard");
        } catch (err: any) {
            setError("Login failed: " + err.message);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-950 text-white">
            <div className="w-full max-w-md space-y-8 rounded-lg border border-gray-800 bg-gray-900 p-8 shadow-xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Binance Tracker</h1>
                    <p className="mt-2 text-sm text-gray-400">Sign in to view your PnL</p>
                </div>
                {error && (
                    <div className="rounded bg-red-900/50 p-3 text-sm text-red-200">
                        {error}
                    </div>
                )}
                <button
                    onClick={handleLogin}
                    className="w-full rounded bg-yellow-500 py-3 font-semibold text-black transition hover:bg-yellow-400"
                >
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}
