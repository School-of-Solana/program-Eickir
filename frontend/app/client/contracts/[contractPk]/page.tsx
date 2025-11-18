"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { useSolanceProgram } from "@/lib/solana/program";
import { useChooseProposal } from "@/hooks/useChooseProposal";

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
  const [reloadCounter, setReloadCounter] = useState(0);

  const {
    chooseProposal,
    loading: choosing,
    error: chooseError,
    lastVaultPda,
  } = useChooseProposal();

  // Chargement contrat + proposals
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
  }, [program, contractPk, reloadCounter]);

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

  const statusLabel = formatStatus(contract?.status);
  const canChoose =
    statusLabel === "Opened" && !loading && !choosing && proposals.length > 0;

  const handleChoose = async (p: any) => {
    if (!program || !contractPk) return;
    try {
      // `p.account.contractor` est DÉJÀ le PDA du ContractorAccount,
      // c'est ce qu'on a stocké on-chain dans initialize_proposal.
      const contractorAccountPk = new PublicKey(
        p.account.contractor.toBase58
          ? p.account.contractor.toBase58()
          : String(p.account.contractor)
      );

      await chooseProposal(contractPk, p.publicKey, contractorAccountPk);

      setReloadCounter((n) => n + 1);
    } catch (e) {
      console.error("handleChoose error:", e);
    }
  };

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

      {(loading || choosing) && (
        <p className="text-sm text-slate-400">
          {loading ? "Loading…" : "Submitting transaction…"}
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {chooseError && <p className="text-sm text-red-400">{chooseError}</p>}

      {lastVaultPda && (
        <p className="text-xs text-emerald-400 break-all">
          Funds locked in vault:{" "}
          <span className="font-mono">{lastVaultPda.toBase58()}</span>
        </p>
      )}

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
              {statusLabel}
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
            {proposals.map((p: any) => {
              const proposalId = Number(
                p.account.proposalId ?? p.account.proposal_id ?? 0
              );
              const contractorPk =
                p.account.contractor?.toBase58?.() ??
                String(p.account.contractor);

              const isSelected =
                contract?.contractor &&
                contract.contractor.toBase58?.() === contractorPk;

              return (
                <div
                  key={p.publicKey.toBase58()}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">
                      Proposal #{proposalId}
                    </p>
                    <p className="text-emerald-400">
                      {lamportsToSol(p.account.amount)} SOL
                    </p>
                  </div>

                  <p className="text-slate-400">
                    Contractor:{" "}
                    <span className="font-mono break-all">
                      {contractorPk}
                    </span>
                  </p>

                  <p className="text-slate-500 break-all">
                    Proposal PDA:{" "}
                    <span className="font-mono">
                      {p.publicKey.toBase58()}
                    </span>
                  </p>

                  <div className="pt-2 flex items-center justify-between gap-2">
                    {isSelected ? (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-900/40 text-emerald-300">
                        Selected for this contract
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleChoose(p)}
                        disabled={!canChoose}
                        className="text-[11px] px-3 py-1 rounded bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {choosing ? "Choosing…" : "Choose this proposal"}
                      </button>
                    )}
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
