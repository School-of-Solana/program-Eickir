"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { useSolanceProgram } from "@/lib/solana/program";

function tryParsePubkey(s: string | undefined): PublicKey | null {
  if (!s) return null;
  try {
    return new PublicKey(s);
  } catch {
    return null;
  }
}

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

export default function ClientContractDetailPage() {
  const params = useParams();
  // Next te donne ici un simple record { contractPk: "..." }
  console.log("useParams() =>", params);

  const contractPkStr =
    typeof params?.contractPk === "string" ? params.contractPk : undefined;

  const contractPk = useMemo(
    () => tryParsePubkey(contractPkStr),
    [contractPkStr]
  );

  const program = useSolanceProgram();
  const [contract, setContract] = useState<any | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!program || !contractPk) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) fetch du contrat
        const c = await (program.account as any).contract.fetch(contractPk);
        setContract(c);

        // 2) fetch des proposals liées à ce contrat
        const allProposals = await (program.account as any).proposal.all([
          {
            memcmp: {
              offset: 8, // 8 bytes de discrim, ensuite le champ `contract: Pubkey`
              bytes: contractPk.toBase58(),
            },
          },
        ]);
        setProposals(allProposals);
      } catch (e: any) {
        console.error("load contract + proposals error:", e);
        setError(e.message ?? "Failed to load contract or proposals");
      } finally {
        setLoading(false);
      }
    })();
  }, [program, contractPk]);

  // Si l’adresse n’est pas valide
  if (!contractPk) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-red-400">
          Invalid contract address
        </h1>

        <p className="text-xs text-slate-400 break-all">
          Raw param (contractPkStr):{" "}
          <span className="font-mono">
            {String(contractPkStr ?? "undefined")}
          </span>
        </p>

        <pre className="text-[10px] bg-slate-900 p-2 rounded border border-slate-800 overflow-x-auto">
          {JSON.stringify(params, null, 2)}
        </pre>

        <Link
          href="/client/contracts"
          className="inline-block text-xs mt-2 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700"
        >
          ← Back to contracts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Contract details</h1>
        <Link
          href="/client/contracts"
          className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700"
        >
          ← Back to contracts
        </Link>
      </div>

      <p className="text-xs text-slate-500 break-all">
        Contract address:{" "}
        <span className="font-mono">{contractPk.toBase58()}</span>
      </p>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {contract && (
        <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {contract.title ?? "(no title)"}
              </h2>
              <p className="text-xs text-slate-400">
                Topic: {contract.topic ?? "-"}
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-slate-800">
              {formatStatus(contract.status)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="space-y-1">
              <p className="text-slate-500">Contract ID</p>
              <p className="font-mono">
                {Number(contract.contractId ?? contract.contract_id ?? 0)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500">Client (PDA)</p>
              <p className="font-mono break-all">
                {contract.client?.toBase58?.() ?? String(contract.client)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500">Selected contractor</p>
              <p className="font-mono break-all">
                {contract.contractor
                  ? contract.contractor.toBase58?.() ??
                    String(contract.contractor)
                  : "None yet"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500">Accepted amount</p>
              <p>
                {contract.amount
                  ? `${lamportsToSol(contract.amount)} SOL`
                  : "Not set"}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Proposals</h2>

        {proposals.length === 0 && !loading && (
          <p className="text-sm text-slate-400">
            No proposals found for this contract yet.
          </p>
        )}

        {proposals.length > 0 && (
          <div className="space-y-3">
            {proposals.map((p: any) => (
              <div
                key={p.publicKey.toBase58()}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">
                    Proposal #
                    {Number(
                      p.account.proposalId ?? p.account.proposal_id ?? 0
                    )}
                  </p>
                  <p className="text-emerald-400">
                    {lamportsToSol(p.account.amount)} SOL
                  </p>
                </div>

                <p className="text-slate-400">
                  Contractor:{" "}
                  <span className="font-mono break-all">
                    {p.account.contractor?.toBase58?.() ??
                      String(p.account.contractor)}
                  </span>
                </p>

                <p className="text-slate-500 break-all">
                  Proposal PDA:{" "}
                  <span className="font-mono">
                    {p.publicKey.toBase58()}
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
