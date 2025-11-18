"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useOpenContracts } from "@/hooks/useOpenContracts";

export default function AvailableContractsPage() {
  const { connected } = useWallet();
  const { contracts, loading, error } = useOpenContracts();

  return (
    <div className="space-y-6 min-h-[70vh]">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Available missions</h1>
        <p className="text-sm text-slate-400">
          All contracts currently in <span className="font-semibold">Opened</span> status.
          You can open a contract and submit a proposal if you&apos;re interested.
        </p>
      </header>

      {!connected && (
        <p className="text-sm text-amber-400">
          Please connect your wallet to see available missions.
        </p>
      )}

      {connected && (
        <>
          {loading && <p className="text-sm text-slate-400">Loading contracts…</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          {!loading && contracts.length === 0 && !error && (
            <p className="text-sm text-slate-500">
              No open contracts at the moment. Check back later.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {contracts.map((c) => (
              <article
                key={c.pubkey.toBase58()}
                className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold">{c.title}</h2>
                  <p className="text-xs text-slate-400 line-clamp-3">
                    {c.topic}
                  </p>
                  <p className="text-xs text-slate-500">
                    Client:{" "}
                    <span className="font-mono text-[11px]">
                      {c.client.slice(0, 4)}…{c.client.slice(-4)}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Contract ID:{" "}
                    <span className="font-mono">{c.contractId}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Amount:{" "}
                    {c.amount !== null
                      ? `${c.amount / 1_000_000_000} SOL`
                      : "Not set yet"}
                  </p>
                </div>

                <div className="mt-3 flex justify-between items-center">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-emerald-400">
                    Opened
                  </span>
                  <Link
                    href={`/contractor/available-contracts/${c.pubkey.toBase58()}`}
                    className="text-[11px] px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600"
                  >
                    View & propose →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
