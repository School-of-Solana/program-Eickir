"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

import { useSolanceProgram } from "@/lib/solana/program";
import { useInitializeClient } from "@/hooks/useInitializeClient";
import { useInitializeContractor } from "@/hooks/useInitializeContractor";

const CLIENT_SEED = "client";
const CONTRACTOR_SEED = "contractor";

export default function HomePage() {
  const { publicKey, connected } = useWallet();
  const program = useSolanceProgram();

  const {
    initializeClient,
    loading: initClientLoading,
    error: initClientError,
  } = useInitializeClient();

  const {
    initializeContractor,
    loading: initContractorLoading,
    error: initContractorError,
  } = useInitializeContractor();

  // états "existe ou pas"
  const [clientPda, setClientPda] = useState<PublicKey | null>(null);
  const [hasClientAccount, setHasClientAccount] = useState<boolean | null>(null);
  const [clientCheckError, setClientCheckError] = useState<string | null>(null);
  const [checkingClient, setCheckingClient] = useState(false);

  const [contractorPda, setContractorPda] = useState<PublicKey | null>(null);
  const [hasContractorAccount, setHasContractorAccount] = useState<boolean | null>(null);
  const [contractorCheckError, setContractorCheckError] =
    useState<string | null>(null);
  const [checkingContractor, setCheckingContractor] = useState(false);

  // --- Check Client account ---
  useEffect(() => {
    if (!program || !publicKey) {
      setClientPda(null);
      setHasClientAccount(null);
      setClientCheckError(null);
      return;
    }

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from(CLIENT_SEED), publicKey.toBuffer()],
      program.programId
    );
    setClientPda(pda);
    setCheckingClient(true);
    setClientCheckError(null);

    (async () => {
      try {
        await (program.account as any).client.fetch(pda);
        setHasClientAccount(true);
      } catch (e: any) {
        const msg = e?.message || e?.toString?.() || "Unknown error";
        setClientCheckError(msg);
        setHasClientAccount(false);
      } finally {
        setCheckingClient(false);
      }
    })();
  }, [program, publicKey]);

  // --- Check Contractor account ---
  useEffect(() => {
    if (!program || !publicKey) {
      setContractorPda(null);
      setHasContractorAccount(null);
      setContractorCheckError(null);
      return;
    }

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from(CONTRACTOR_SEED), publicKey.toBuffer()],
      program.programId
    );
    setContractorPda(pda);
    setCheckingContractor(true);
    setContractorCheckError(null);

    (async () => {
      try {
        await (program.account as any).contractor.fetch(pda);
        setHasContractorAccount(true);
      } catch (e: any) {
        const msg = e?.message || e?.toString?.() || "Unknown error";
        setContractorCheckError(msg);
        setHasContractorAccount(false);
      } finally {
        setCheckingContractor(false);
      }
    })();
  }, [program, publicKey]);

  // --- Rendu ---
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome to <span className="text-emerald-400">Solance</span>
        </h1>
        <p className="text-sm text-slate-400 max-w-xl">
          A simple on-chain freelance marketplace on Solana. Clients create
          missions (contracts), contractors send proposals, funds are escrowed
          in a vault, and released once the work is done.
        </p>
      </section>

      {!connected && (
        <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-amber-400">
            Connect your wallet using the button in the top-right to start using
            Solance.
          </p>
        </section>
      )}

      {connected && (
        <section className="grid gap-6 md:grid-cols-2">
          {/* CARD CLIENT */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <h2 className="text-lg font-semibold">Use Solance as a Client</h2>
            <p className="text-xs text-slate-400">
              Post missions, review proposals from contractors, choose a
              proposal, escrow funds and release payment when the work is done.
            </p>

            <div className="text-xs text-slate-400 space-y-1">
              <p>
                Status :{" "}
                {checkingClient ? (
                  <span className="text-slate-300">Checking…</span>
                ) : hasClientAccount ? (
                  <span className="text-emerald-400">Client account found</span>
                ) : (
                  <span className="text-amber-400">
                    No client account for this wallet
                  </span>
                )}
              </p>
              {clientPda && (
                <p className="break-all">
                  Client PDA:{" "}
                  <span className="font-mono text-slate-500">
                    {clientPda.toBase58()}
                  </span>
                </p>
              )}
            </div>

            {initClientError && (
              <p className="text-xs text-red-400">{initClientError}</p>
            )}

            <div className="flex gap-3 mt-2">
              {hasClientAccount ? (
                <Link
                  href="/client"
                  className="px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-sm font-medium"
                >
                  Go to Client space
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={initClientLoading || checkingClient || !program}
                  onClick={async () => {
                    try {
                      await initializeClient();
                    } catch {
                      // erreur déjà gérée dans le hook
                    }
                  }}
                  className="px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-sm font-medium"
                >
                  {initClientLoading ? "Initializing…" : "Initialize Client account"}
                </button>
              )}
            </div>
          </div>

          {/* CARD CONTRACTOR */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <h2 className="text-lg font-semibold">Use Solance as a Contractor</h2>
            <p className="text-xs text-slate-400">
              Browse open missions, submit proposals with your price, update
              them, and get paid once the work is marked as done.
            </p>

            <div className="text-xs text-slate-400 space-y-1">
              <p>
                Status :{" "}
                {checkingContractor ? (
                  <span className="text-slate-300">Checking…</span>
                ) : hasContractorAccount ? (
                  <span className="text-emerald-400">
                    Contractor account found
                  </span>
                ) : (
                  <span className="text-amber-400">
                    No contractor account for this wallet
                  </span>
                )}
              </p>
              {contractorPda && (
                <p className="break-all">
                  Contractor PDA:{" "}
                  <span className="font-mono text-slate-500">
                    {contractorPda.toBase58()}
                  </span>
                </p>
              )}
            </div>

            {initContractorError && (
              <p className="text-xs text-red-400">{initContractorError}</p>
            )}

            <div className="flex gap-3 mt-2">
              {hasContractorAccount ? (
                <Link
                  href="/contractor"
                  className="px-3 py-2 rounded bg-indigo-500 hover:bg-indigo-600 text-sm font-medium"
                >
                  Go to Contractor space
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={initContractorLoading || checkingContractor || !program}
                  onClick={async () => {
                    try {
                      await initializeContractor();
                    } catch {
                      // error already handled in hook
                    }
                  }}
                  className="px-3 py-2 rounded bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-sm font-medium"
                >
                  {initContractorLoading
                    ? "Initializing…"
                    : "Initialize Contractor account"}
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
