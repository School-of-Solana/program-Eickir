"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useSolanceProgram } from "@/lib/solana/program";
import { useMarkWorkDone } from "@/hooks/useMarkWorkDone";

const CONTRACTOR_SEED = "contractor";

function lamportsToSol(v: any): string {
  if (v === null || v === undefined) return "-";
  try {
    return (Number(v) / 1_000_000_000).toFixed(3);
  } catch {
    return "-";
  }
}

function formatStatus(status: any): string {
  if (!status) return "Unknown";
  if (status.opened !== undefined) return "Opened";
  if (status.accepted !== undefined) return "Accepted";
  if (status.closed !== undefined) return "Closed";
  return "Unknown";
}

function extractPubkeyFromMaybeOption(maybe: any): string | null {
  if (!maybe) return null;
  if (maybe.some) {
    if (typeof maybe.some.toBase58 === "function") return maybe.some.toBase58();
    return String(maybe.some);
  }
  if (typeof maybe.toBase58 === "function") return maybe.toBase58();
  return String(maybe);
}

export default function ContractorMyMissionsPage() {
  const { publicKey } = useWallet();
  const program = useSolanceProgram();

  const [contractorPda, setContractorPda] = useState<PublicKey | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  const {
    markWorkDone,
    loading: marking,
    error: markError,
  } = useMarkWorkDone();

  useEffect(() => {
    if (!program || !publicKey) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [pda] = PublicKey.findProgramAddressSync(
          [Buffer.from(CONTRACTOR_SEED), publicKey.toBuffer()],
          program.programId
        );
        setContractorPda(pda);

        try {
          await (program.account as any).contractor.fetch(pda);
        } catch {
          setError(
            "You don't have a Contractor account yet. Go to the Contractor dashboard to initialize it."
          );
          setMissions([]);
          return;
        }

        const allContracts = await (program.account as any).contract.all();
        const myMissions = allContracts.filter((c: any) => {
          const contractorOnContract = extractPubkeyFromMaybeOption(
            c.account.contractor
          );
          const statusLabel = formatStatus(c.account.status);
          return (
            contractorOnContract === pda.toBase58() &&
            statusLabel === "Accepted"
          );
        });

        setMissions(myMissions);
      } catch (e: any) {
        console.error("load missions error:", e);
        setError(e.message ?? "Failed to load contractor missions");
      } finally {
        setLoading(false);
      }
    })();
  }, [program, publicKey, reloadCounter]);

  const handleMarkDone = async (contractPk: PublicKey) => {
    try {
      await markWorkDone(contractPk);
      setReloadCounter((n) => n + 1);
    } catch (e) {
      console.error("markWorkDone error:", e);
    }
  };

  if (!publicKey) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">My missions</h1>
        <p className="text-sm text-slate-400">
          Connect your wallet to see your active missions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">My active missions</h1>
        <Link
          href="/contractor"
          className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700"
        >
          ← Back to contractor dashboard
        </Link>
      </div>

      {contractorPda && (
        <p className="text-xs text-slate-500 break-all">
          Contractor account (PDA):{" "}
          <span className="font-mono">{contractorPda.toBase58()}</span>
        </p>
      )}

      {(loading || marking) && (
        <p className="text-sm text-slate-400">
          {loading ? "Loading missions…" : "Submitting transaction…"}
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {markError && <p className="text-sm text-red-400">{markError}</p>}

      {missions.length === 0 && !loading && !error && (
        <p className="text-sm text-slate-400">
          You have no accepted missions yet.
        </p>
      )}

      {missions.length > 0 && (
        <div className="space-y-3">
          {missions.map((m: any) => {
            const c = m.account;
            const contractPk: PublicKey = m.publicKey;
            const statusLabel = formatStatus(c.status);
            const acceptedAmount = c.amount ? Number(c.amount) : null;

            return (
              <div
                key={contractPk.toBase58()}
                className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {c.title ?? "(no title)"}
                    </p>
                    <p className="text-slate-400">
                      {c.topic
                        ? c.topic.slice(0, 120) +
                          (c.topic.length > 120 ? "…" : "")
                        : "-"}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-slate-800">
                    {statusLabel}
                  </span>
                </div>

                <p className="text-slate-500 break-all">
                  Contract:{" "}
                  <span className="font-mono">
                    {contractPk.toBase58()}
                  </span>
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-500">Client (PDA)</p>
                    <p className="font-mono break-all">
                      {c.client?.toBase58?.() ?? String(c.client)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Accepted amount</p>
                    <p>
                      {acceptedAmount !== null
                        ? `${lamportsToSol(acceptedAmount)} SOL`
                        : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <Link
                    href={`/client/contracts/${contractPk.toBase58()}`}
                    className="text-[11px] px-3 py-1 rounded bg-slate-800 hover:bg-slate-700"
                  >
                    View contract details
                  </Link>

                  {statusLabel === "Accepted" ? (
                    <button
                      type="button"
                      onClick={() => handleMarkDone(contractPk)}
                      disabled={marking}
                      className="text-[11px] px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40"
                    >
                      {marking ? "Marking…" : "Mark work done"}
                    </button>
                  ) : (
                    <span className="text-[11px] px-2 py-1 rounded bg-slate-800">
                      {statusLabel === "Closed"
                        ? "Already closed"
                        : "Not accepted yet"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
