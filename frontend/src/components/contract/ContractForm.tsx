"use client";

import { FormEvent, useState } from "react";
import { useCreateContract } from "@/hooks/useCreateContract";
import { useWallet } from "@solana/wallet-adapter-react";

export function ContractForm() {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");

  const { connected } = useWallet();
  const { createContract, loading, error, lastContractPda } = useCreateContract();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setLocalError(null);

    console.log("➡️ Submit create contract clicked");

    if (!connected) {
      setLocalError("Wallet not connected. Please connect your wallet first.");
      console.warn("⚠️ Wallet not connected");
      return;
    }

    try {
      console.log("➡️ Calling createContract with:", { title, topic });
      const res = await createContract(title, topic);
      console.log(
        "✅ Contract created:",
        res,
        res.contractPda.toBase58()
      );

      setSuccessMessage(
        `Contract created successfully: ${res.contractPda.toBase58()}`
      );

      setTitle("");
      setTopic("");
    } catch (e: any) {
      console.error("❌ Error in onSubmit createContract:", e);

      setLocalError(e?.message ?? "Failed to create contract");
    }
  };

  const isDisabled = !connected || loading;

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
      <h2 className="text-lg font-semibold mb-2">Create a new contract</h2>

      {!connected && (
        <p className="text-sm text-amber-400 mb-2">
          Please connect your wallet to create a contract.
        </p>
      )}

      <div>
        <label className="block text-sm mb-1">Title</label>
        <input
          className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
          placeholder="Blockchain engineer on Solana"
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Topic / Description</label>
        <textarea
          className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
          rows={5}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={500}
          required
          placeholder="Describe what you expect from the freelancer..."
        />
      </div>

      {(localError || error) && (
        <p className="text-sm text-red-400">
          {localError ?? error}
        </p>
      )}

      {successMessage && (
        <p className="text-sm text-emerald-400 break-all">
          {successMessage}
        </p>
      )}

      {lastContractPda && !successMessage && (
        <p className="text-xs text-emerald-400 break-all">
          Last contract: {lastContractPda.toBase58()}
        </p>
      )}

      <button
        type="submit"
        disabled={isDisabled}
        className="px-4 py-2 rounded bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {!connected
          ? "Connect wallet first"
          : loading
          ? "Creating..."
          : "Create contract"}
      </button>
    </form>
  );
}
