// frontend/app/contracts/new/page.tsx
"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useCreateContract } from "@/hooks/useCreateContract";

export default function NewContractPage() {
  const { connected } = useWallet();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");

  const { createContract, loading, error } = useCreateContract();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) return;

    // ici tu appelleras:
    await createContract(title, topic);
    console.log("TODO: call createContract(title, topic)", { title, topic });
  };

  if (!connected) {
    return (
      <div className="mt-10 space-y-4">
        <h1 className="text-2xl font-semibold">Create a new contract</h1>
        <p className="text-slate-300 text-sm">
          Please connect your wallet as a client before creating a contract.
        </p>
        <WalletButton />
      </div>
    );
  }

  return (
    <div className="mt-10 max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Create a new contract</h1>
      <p className="text-slate-300 text-sm">
        Describe your mission. Contractors will be able to submit proposals
        based on this contract.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Title</label>
          <input
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior Solana engineer for DeFi dApp"
            maxLength={100}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500 min-h-[120px]"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Explain what you need, expected deliverables, deadlines, etc."
            maxLength={500}
            required
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-indigo-500 hover:bg-indigo-600 px-4 py-2 text-sm font-medium"
        >
          Create contract (TODO: on-chain)
        </button>
      </form>
    </div>
  );
}
