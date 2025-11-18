"use client";

import { useWallet } from "@solana/wallet-adapter-react";
//import { useContractorAccount } from "@/hooks/useContractorAccount";

export default function ContractorPage() {
  const { connected } = useWallet();
  //const { contractorAccount, loading, error } = useContractorAccount();

  return (
    <div className="h-full min-h-[70vh] flex flex-col">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold mb-1">Contractor dashboard</h1>
        <p className="text-sm text-slate-400">
          Browse missions and submit proposals as a freelancer.
        </p>
      </header>

      <div className="flex-1 flex flex-col gap-6">
        {!connected && (
          <p className="text-sm text-amber-400">
            Please connect your wallet to see your contractor profile.
          </p>
        )}

        {connected && (
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded border border-slate-800 bg-slate-950/60 px-4 py-3">
              <h2 className="text-sm font-semibold mb-1">Available missions</h2>
              <p className="text-xs text-slate-400 mb-2">
                Explore open contracts and send your proposals.
              </p>
              <a
                href="contractor/available-contracts"
                className="inline-flex text-xs px-3 py-1 rounded bg-indigo-500 hover:bg-indigo-600"
              >
                View contracts
              </a>
            </section>

            <section className="rounded border border-slate-800 bg-slate-950/60 px-4 py-3">
              <h2 className="text-sm font-semibold mb-1">Your proposals</h2>
              <p className="text-xs text-slate-400 mb-2">
                Track the proposals you submitted and their status.
              </p>
              <a
                href="contractor/proposals"
                className="inline-flex text-xs px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600"
              >
                Go to proposals
              </a>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
