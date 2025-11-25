"use client";

import { PublicKey } from "@solana/web3.js";

interface ContractAccount {
  client: PublicKey;
  contractor: string | PublicKey | null; 
  contractId: bigint | number;
  title: string;
  topic: string;
  amount: bigint | number | null;
  status: any; 
}

interface Props {
  contractPubkey: string;
  contract: ContractAccount;
}

export function ContractHeader({ contractPubkey, contract }: Props) {
  return (
    <section className="border border-slate-800 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{contract.title}</h1>
        <ContractStatusBadge status={contract.status} />
      </div>
      <p className="text-sm text-slate-300">{contract.topic}</p>
      <p className="text-xs text-slate-400">
        Contract pubkey: <code>{contractPubkey}</code>
      </p>
      <p className="text-xs text-slate-400">
        Client: <code>{contract.client.toBase58()}</code>
      </p>
      {contract.amount != null && (
        <p className="text-xs text-slate-400">
          Amount: {(Number(contract.amount) / 1_000_000_000).toFixed(2)} SOL
        </p>
      )}
    </section>
  );
}

function ContractStatusBadge({ status }: { status: any }) {
  let label = "Unknown";
  if ("opened" in status) label = "Opened";
  if ("accepted" in status) label = "Accepted";
  if ("closed" in status) label = "Closed";

  const color =
    label === "Opened"
      ? "bg-yellow-500/20 text-yellow-300"
      : label === "Accepted"
      ? "bg-indigo-500/20 text-indigo-300"
      : "bg-emerald-500/20 text-emerald-300";

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
