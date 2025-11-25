"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

import { useSolanceProgram } from "@/lib/solana/program";
import { useClaimPayment } from "@/hooks/useClaimPayment";

const CLIENT_SEED = "client";

function lamportsToSol(v: any): string {
  if (v === null || v === undefined) return "-";
  try {
    return (Number(v) / 1_000_000_000).toFixed(3);
  } catch {
    return "-";
  }
}

function isClosed(status: any): boolean {
  if (!status) return false;
  return status.closed !== undefined;
}

function isPaid(status: any): boolean {
  if (!status) return false;
  return status.paid !== undefined;
}

export default function ClientPendingPaymentsPage() {
  const { connected, publicKey } = useWallet();
  const program = useSolanceProgram();

  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  const {
    claimPayment,
    loading: claiming,
    error: claimError,
  } = useClaimPayment();


  const clientPda = useMemo(() => {
    if (!program || !publicKey) return null;
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from(CLIENT_SEED), publicKey.toBuffer()],
      program.programId
    );
    return pda;
  }, [program, publicKey]);

  useEffect(() => {
    if (!program || !publicKey || !clientPda) return;

    (async () => {
      setLoading(true);
      setLocalError(null);
      try {
        const all = await (program.account as any).contract.all([
          {
            memcmp: {
              offset: 8,
              bytes: clientPda.toBase58(),
            },
          },
        ]);

        const closedNotPaidForClient = all.filter((c: any) => {
          const s = c.account.status;
          return isClosed(s) && !isPaid(s);
        });

        setContracts(closedNotPaidForClient);
      } catch (e: any) {
        console.error("load pending payments error:", e);
        setLocalError(e.message ?? "Failed to load pending payments");
      } finally {
        setLoading(false);
      }
    })();
  }, [program, publicKey, clientPda, reloadCounter]);

  const handleReleasePayment = async (c: any) => {
    if (!program || !publicKey) return;

    try {
      const contractPk: PublicKey = c.publicKey;

      const contractorAccountPkRaw = c.account.contractor;
      if (!contractorAccountPkRaw) {
        throw new Error("No contractor account set on this contract");
      }

      const contractorAccountPk = new PublicKey(
        contractorAccountPkRaw.toBase58
          ? contractorAccountPkRaw.toBase58()
          : contractorAccountPkRaw
      );

      const contractorAccount = await (program.account as any).contractor.fetch(
        contractorAccountPk
      );
      const contractorWalletPk: PublicKey = contractorAccount.owner;

      await claimPayment(contractPk, contractorWalletPk, contractorAccountPk);


      setReloadCounter((n) => n + 1);
    } catch (e) {
      console.error("handleReleasePayment error:", e);

    }
  };

  if (!connected) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Pending payments</h1>
        <p className="text-sm text-amber-400">
          Please connect your wallet as a client to see contracts waiting for
          payment release.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pending payments</h1>
          <p className="text-sm text-slate-400">
            Contracts that are closed and locked in vault, waiting for you
            (the client) to release the payment to the contractor.
          </p>
        </div>
        <Link
          href="/client/contracts"
          className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700"
        >
          ← Back to contracts
        </Link>
      </header>

      <section className="text-xs space-y-2">
        <p className="text-slate-500">Connected client wallet:</p>
        <p className="font-mono break-all text-slate-100">
          {publicKey?.toBase58()}
        </p>
        {clientPda && (
          <p className="text-slate-500">
            Client account PDA:{" "}
            <span className="font-mono break-all">
              {clientPda.toBase58()}
            </span>
          </p>
        )}
      </section>

      {(loading || claiming) && (
        <p className="text-sm text-slate-400">
          {loading ? "Loading pending contracts…" : "Sending transaction…"}
        </p>
      )}

      {localError && <p className="text-sm text-red-400">{localError}</p>}

      {claimError && <p className="text-sm text-red-400">{claimError}</p>}

      <section className="space-y-3">
        {contracts.length === 0 && !loading && (
          <p className="text-sm text-slate-400">
            You don&apos;t have any closed contracts pending payment at the
            moment.
          </p>
        )}

        {contracts.length > 0 && (
          <div className="space-y-3">
            {contracts.map((c: any) => {
              const contractPk = c.publicKey;
              const amountOpt = c.account.amount;
              const displayAmount = amountOpt
                ? lamportsToSol(amountOpt)
                : "-";

              const contractorAccountPkRaw = c.account.contractor;
              const contractorAccountStr = contractorAccountPkRaw
                ? contractorAccountPkRaw.toBase58?.() ??
                  String(contractorAccountPkRaw)
                : "Unknown";

              return (
                <div
                  key={contractPk.toBase58()}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="space-y-1">
                      <h2 className="text-sm font-semibold">
                        {c.account.title ?? "(no title)"}
                      </h2>
                      <p className="text-slate-400">
                        Topic: {c.account.topic ?? "-"}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-emerald-900/40 text-emerald-300 text-[10px]">
                      pending payment
                    </span>
                  </div>

                  <p className="text-slate-400">
                    Contract address:{" "}
                    <span className="font-mono break-all">
                      {contractPk.toBase58()}
                    </span>
                  </p>

                  <p className="text-slate-400">
                    Contractor account (PDA):{" "}
                    <span className="font-mono break-all">
                      {contractorAccountStr}
                    </span>
                  </p>

                  <p className="text-slate-400">
                    Locked amount:{" "}
                    <span className="font-semibold">
                      {displayAmount} SOL
                    </span>
                  </p>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <Link
                      href={`/client/contracts/${contractPk.toBase58()}`}
                      className="text-[11px] text-slate-300 hover:underline"
                    >
                      View contract details
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleReleasePayment(c)}
                      disabled={claiming}
                      className="text-[11px] px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {claiming ? "Releasing…" : "Release payment"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
