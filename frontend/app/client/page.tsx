"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

import { useSolanceProgram } from "@/lib/solana/program";

const CLIENT_SEED = "client";

export default function ClientPage() {
  const { connected, publicKey } = useWallet();
  const program = useSolanceProgram();

  const [clientPda, setClientPda] = useState<PublicKey | null>(null);
  const [hasClientAccount, setHasClientAccount] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    if (!program || !publicKey) {
      setClientPda(null);
      setHasClientAccount(null);
      setChecking(false);
      setCheckError(null);
      return;
    }

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from(CLIENT_SEED), publicKey.toBuffer()],
      program.programId
    );

    setClientPda(pda);
    setChecking(true);
    setCheckError(null);

    (async () => {
      try {
        await (program.account as any).client.fetch(pda);
        setHasClientAccount(true);
      } catch (e: any) {
        const msg = e?.message || e?.toString?.() || "Unknown error";
        setCheckError(msg);
        setHasClientAccount(false);
      } finally {
        setChecking(false);
      }
    })();
  }, [program, publicKey]);

  return (
    <div className="h-full min-h-[70vh] flex flex-col gap-6">
      {/* Header */}
      <header className="mb-2">
        <h1 className="text-2xl font-semibold mb-1">Client dashboard</h1>
        <p className="text-sm text-slate-400">
          Manage your missions, review proposals, and release payments.
        </p>
      </header>

      {/* Wallet non connecté */}
      {!connected && (
        <p className="text-sm text-amber-400">
          Please connect your wallet to see your client profile.
        </p>
      )}

      {/* Wallet connecté : on vérifie le Client account */}
      {connected && (
        <>
          {/* Infos sur le wallet + état du Client account */}
          <section className="rounded border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs space-y-1">
            <p className="text-slate-400">Connected client wallet:</p>
            <p className="font-mono break-all text-slate-100">
              {publicKey?.toBase58()}
            </p>

            {clientPda && (
              <p className="text-slate-400">
                Client PDA:{" "}
                <span className="font-mono text-slate-500">
                  {clientPda.toBase58()}
                </span>
              </p>
            )}

            <p className="text-slate-400">
              Status:{" "}
              {checking ? (
                <span className="text-slate-200">
                  Checking client account…
                </span>
              ) : hasClientAccount ? (
                <span className="text-emerald-400">
                  Client account found ✅
                </span>
              ) : (
                <span className="text-amber-400">
                  No client account initialized for this wallet
                </span>
              )}
            </p>

            {checkError && !hasClientAccount && (
              <p className="text-[11px] text-slate-500">
                (Fetch error: {checkError})
              </p>
            )}
          </section>

          {/* Si le compte client n'existe pas encore */}
          {hasClientAccount === false && !checking && (
            <section className="rounded border border-amber-700 bg-amber-950/40 px-4 py-3 text-xs space-y-2">
              <p className="text-amber-300">
                You don&apos;t have a <span className="font-semibold">Client</span>{" "}
                account on-chain yet.
              </p>
              <p className="text-amber-200">
                Go back to the home page and use the{" "}
                <b>&quot;Initialize Client account&quot;</b> button in the Client card.
              </p>
              <Link
                href="/"
                className="inline-flex text-xs px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 mt-1 text-slate-900 font-medium"
              >
                ← Back to home to initialize
              </Link>
            </section>
          )}

          {/* Si le compte client existe, on affiche le vrai dashboard */}
          {hasClientAccount && !checking && (
            <div className="grid gap-4 md:grid-cols-3">
              {/* Carte 1 – Vos contrats */}
              <section className="rounded border border-slate-800 bg-slate-950/60 px-4 py-3">
                <h2 className="text-sm font-semibold mb-1">Your contracts</h2>
                <p className="text-xs text-slate-400 mb-2">
                  View and manage all contracts you created.
                </p>
                <Link
                  href="/client/contracts"
                  className="inline-flex text-xs px-3 py-1 rounded bg-indigo-500 hover:bg-indigo-600"
                >
                  Go to contracts
                </Link>
              </section>

              {/* Carte 2 – Créer une mission */}
              <section className="rounded border border-slate-800 bg-slate-950/60 px-4 py-3">
                <h2 className="text-sm font-semibold mb-1">
                  Create new mission
                </h2>
                <p className="text-xs text-slate-400 mb-2">
                  Start a new freelance mission and let contractors send
                  proposals.
                </p>
                <Link
                  href="/client/create-contract"
                  className="inline-flex text-xs px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600"
                >
                  New contract
                </Link>
              </section>

              {/* Carte 3 – Pending payments */}
              <section className="rounded border border-slate-800 bg-slate-950/60 px-4 py-3">
                <h2 className="text-sm font-semibold mb-1">Pending payments</h2>
                <p className="text-xs text-slate-400 mb-2">
                  See closed contracts with funds locked in the vault and
                  release payments to contractors.
                </p>
                <Link
                  href="/client/pending-payments"
                  className="inline-flex text-xs px-3 py-1 rounded bg-amber-500 hover:bg-amber-600"
                >
                  View pending payments
                </Link>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
