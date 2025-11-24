"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useClientContracts } from "@/hooks/useClientContracts";

/**
 * Helper pour afficher le status (enum Anchor) proprement.
 * Anchor renvoie souvent un objet du type { opened: {} } / { accepted: {} } / { closed: {} }.
 */
function formatStatus(status: any): string {
  if (!status) return "Unknown";

  if (typeof status === "string") return status;

  if ("opened" in status) return "Opened";
  if ("accepted" in status) return "Accepted";
  if ("closed" in status) return "Closed";

  return "Unknown";
}

export default function ContractsPage() {
  const { connected } = useWallet();
  const { contracts, loading, error } = useClientContracts();

  if (!connected) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Your contracts</h1>
        <p className="text-sm text-amber-400">
          Please connect your wallet to see your contracts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold mb-1">Your contracts</h1>
          <p className="text-sm text-slate-400">
            These are the contracts you created as a client.
          </p>
        </div>
        <Link
          href="/client/create-contract"
          className="text-xs px-3 py-2 rounded bg-indigo-500 hover:bg-indigo-600 text-white"
        >
          + New contract
        </Link>
      </div>

      {/* Loading / Error */}
      {loading && (
        <p className="text-sm text-slate-400">Loading contracts...</p>
      )}

      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && contracts.length === 0 && (
        <p className="text-sm text-slate-400">
          You don&apos;t have any contracts yet.{" "}
          <Link
            href="/client/create-contract"
            className="underline text-indigo-400 hover:text-indigo-300"
          >
            Create your first one.
          </Link>
        </p>
      )}

      {/* List */}
      <ul className="space-y-3">
        {contracts.map((c) => (
          <li
            key={c.pda.toBase58()}
            className="rounded border border-slate-800 bg-slate-950/60 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate">
                  {c.data.title ?? `Contract #${c.id}`}
                </h2>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {c.data.topic}
                </p>
                <p className="mt-1 text-[10px] text-slate-500 break-all">
                  PDA: {c.pda.toBase58()}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 text-right">
                <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-100">
                  {formatStatus(c.data.status)}
                </span>
                <Link
                  href={`/client/contracts/${c.pda}`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                >
                  View details
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
