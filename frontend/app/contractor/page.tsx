"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

import { useSolanceProgram } from "@/lib/solana/program";

const CONTRACTOR_SEED = "contractor";

export default function ContractorPage() {
  const { connected, publicKey } = useWallet();
  const program = useSolanceProgram();

  const [contractorPda, setContractorPda] = useState<PublicKey | null>(null);
  const [hasContractorAccount, setHasContractorAccount] = useState<
    boolean | null
  >(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    if (!program || !publicKey) {
      setContractorPda(null);
      setHasContractorAccount(null);
      setChecking(false);
      setCheckError(null);
      return;
    }

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from(CONTRACTOR_SEED), publicKey.toBuffer()],
      program.programId
    );

    setContractorPda(pda);
    setChecking(true);
    setCheckError(null);

    (async () => {
      try {
        await (program.account as any).contractor.fetch(pda);
        setHasContractorAccount(true);
      } catch (e: any) {

        const msg = e?.message || e?.toString?.() || "Unknown error";
        setCheckError(msg);
        setHasContractorAccount(false);
      } finally {
        setChecking(false);
      }
    })();
  }, [program, publicKey]);

  return (
    <div className="h-full min-h-[70vh] flex flex-col gap-6">
      {/* Header */}
      <header className="mb-2">
        <h1 className="text-2xl font-semibold mb-1">Contractor dashboard</h1>
        <p className="text-sm text-slate-400">
          Browse missions, submit proposals, track your work and payments as a
          freelancer.
        </p>
      </header>

      {/* Wallet not connected */}
      {!connected && (
        <p className="text-sm text-amber-400">
          Please connect your wallet to access your contractor tools.
        </p>
      )}

      {/* Wallet connecté, mais on vérifie l'account contractor */}
      {connected && (
        <>
          {/* État de vérification du compte contractor */}
          <section className="rounded border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs space-y-1">
            <p className="text-slate-400">
              Connected wallet (potential contractor):
            </p>
            <p className="font-mono break-all text-slate-100">
              {publicKey?.toBase58()}
            </p>

            {contractorPda && (
              <p className="text-slate-400">
                Contractor PDA:{" "}
                <span className="font-mono text-slate-500">
                  {contractorPda.toBase58()}
                </span>
              </p>
            )}

            <p className="text-slate-400">
              Status:{" "}
              {checking ? (
                <span className="text-slate-200">Checking contractor account…</span>
              ) : hasContractorAccount ? (
                <span className="text-emerald-400">
                  Contractor account found ✅
                </span>
              ) : (
                <span className="text-amber-400">
                  No contractor account initialized for this wallet
                </span>
              )}
            </p>

            {checkError && !hasContractorAccount && (
              <p className="text-[11px] text-slate-500">
                (Fetch error: {checkError})
              </p>
            )}
          </section>

          {/* Si le compte contractor n'existe pas encore */}
          {hasContractorAccount === false && !checking && (
            <section className="rounded border border-amber-700 bg-amber-950/40 px-4 py-3 text-xs space-y-2">
              <p className="text-amber-300">
                You don&apos;t have a <span className="font-semibold">Contractor</span>{" "}
                account on-chain yet.
              </p>
              <p className="text-amber-200">
                Go back to the home page and use the <b>&quot;Initialize Contractor
                account&quot;</b> button in the Contractor card.
              </p>
              <Link
                href="/"
                className="inline-flex text-xs px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 mt-1 text-slate-900 font-medium"
              >
                ← Back to home to initialize
              </Link>
            </section>
          )}

          {/* Si le compte existe, on affiche le vrai dashboard */}
          {hasContractorAccount && !checking && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Available missions */}
              <section className="rounded border border-slate-800 bg-slate-950/60 px-4 py-3 flex flex-col gap-2">
                <h2 className="text-sm font-semibold">Available missions</h2>
                <p className="text-xs text-slate-400">
                  Explore open contracts from clients and send your proposals.
                </p>
                <Link
                  href="/contractor/available-contracts"
                  className="inline-flex text-xs px-3 py-1 rounded bg-indigo-500 hover:bg-indigo-600 mt-1"
                >
                  View open contracts
                </Link>
              </section>

              {/* My missions (accepted contracts) */}
              <section className="rounded border border-slate-800 bg-slate-950/60 px-4 py-3 flex flex-col gap-2">
                <h2 className="text-sm font-semibold">My missions</h2>
                <p className="text-xs text-slate-400">
                  See contracts where you have been selected as contractor. You
                  can mark work as done from there.
                </p>
                <Link
                  href="/contractor/my-missions"
                  className="inline-flex text-xs px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600 mt-1"
                >
                  Go to my missions
                </Link>
              </section>

              {/* Pending payments */}
              <section className="rounded border border-slate-800 bg-slate-950/60 px-4 py-3 flex flex-col gap-2">
                <h2 className="text-sm font-semibold">Pending payments</h2>
                <p className="text-xs text-slate-400">
                  Contracts you finished (Closed) and that are waiting for the
                  client to release your payment.
                </p>
                <Link
                  href="/contractor/pending-payments"
                  className="inline-flex text-xs px-3 py-1 rounded bg-fuchsia-500 hover:bg-fuchsia-600 mt-1"
                >
                  View pending payments
                </Link>
              </section>

              {/* Proposals */}
              <section className="rounded border border-slate-800 bg-slate-950/60 px-4 py-3 flex flex-col gap-2">
                <h2 className="text-sm font-semibold">Your proposals</h2>
                <p className="text-xs text-slate-400">
                  Track all proposals you&apos;ve sent and update them when needed.
                </p>
                <Link
                  href="/contractor/proposals"
                  className="inline-flex text-xs px-3 py-1 rounded bg-sky-500 hover:bg-sky-600 mt-1"
                >
                  Go to proposals
                </Link>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
