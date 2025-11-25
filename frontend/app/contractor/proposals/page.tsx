"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useSolanceProgram } from "@/lib/solana/program";
import { useUpdateProposal } from "@/hooks/useUpdateProposal";

const CONTRACTOR_SEED = "contractor";

function lamportsToSol(v: any): string {
  if (v === null || v === undefined) return "-";
  try {
    return (Number(v) / 1_000_000_000).toFixed(3);
  } catch {
    return "-";
  }
}

export default function ContractorProposalsPage() {
  const { publicKey } = useWallet();
  const program = useSolanceProgram();

  const [contractorPda, setContractorPda] = useState<PublicKey | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [contractsByPk, setContractsByPk] = useState<
    Record<string, any>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  const [amountInputs, setAmountInputs] = useState<Record<string, string>>({});
  const {
    updateProposal,
    loading: updating,
    error: updateError,
  } = useUpdateProposal();

  useEffect(() => {
    if (!program || !publicKey) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [pda] = PublicKey.findProgramAddressSync(
          [Buffer.from(CONTRACTOR_SEED), publicKey.toBuffer()],
          program.programId
        );
        setContractorPda(pda);

        try {
          await (program.account as any).contractor.fetch(pda);
        } catch {
          setError(
            "You don't have a Contractor account yet. Go to the Contractor dashboard to initialize it."
          );
          setProposals([]);
          return;
        }

        const allProps = await (program.account as any).proposal.all();

        const mine = allProps.filter(
          (p: any) =>
            p.account.contractor?.toBase58?.() === pda.toBase58()
        );

        setProposals(mine);

        const uniqueContractPks: string[] = Array.from(
          new Set<string>(
            mine.map(
              (p: any): string =>
                (p.account.contract as PublicKey).toBase58()
            )
          )
        );

        const contractsMap: Record<string, any> = {};
        await Promise.all(
          uniqueContractPks.map(async (pkStr: string) => {
            const pk = new PublicKey(pkStr);
            try {
              const c = await (program.account as any).contract.fetch(pk);
              contractsMap[pkStr] = c;
            } catch (e) {
              console.warn("Failed to fetch contract", pkStr, e);
            }
          })
        );

        setContractsByPk(contractsMap);
      } catch (e: any) {
        console.error("load proposals error:", e);
        setError(e.message ?? "Failed to load proposals");
      } finally {
        setLoading(false);
      }
    })();
  }, [program, publicKey, reloadCounter]);

  const handleAmountChange = (proposalPkStr: string, value: string) => {
    setAmountInputs((prev) => ({
      ...prev,
      [proposalPkStr]: value,
    }));
  };

  const handleUpdate = async (p: any) => {
    const proposalPk: PublicKey = p.publicKey;
    const proposalPkStr = proposalPk.toBase58();
    const contractPk: PublicKey = p.account.contract;

    const newAmountSolStr = amountInputs[proposalPkStr];
    if (!newAmountSolStr) return;

    const sol = parseFloat(newAmountSolStr);
    if (isNaN(sol) || sol <= 0) {
      alert("Please enter a valid positive SOL amount.");
      return;
    }

    const lamports = BigInt(Math.round(sol * 1_000_000_000));

    try {
      await updateProposal(contractPk, proposalPk, lamports);
      setReloadCounter((n) => n + 1);
      setAmountInputs((prev) => ({
        ...prev,
        [proposalPkStr]: "",
      }));
    } catch (e) {
      console.error("updateProposal error:", e);
    }
  };

  if (!publicKey) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">My proposals</h1>
        <p className="text-sm text-slate-400">
          Connect your wallet to see your proposals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">My proposals</h1>
        <Link
          href="/contractor"
          className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700"
        >
          ← Back to contractor dashboard
        </Link>
      </div>

      {contractorPda && (
        <p className="text-xs text-slate-500 break-all">
          Contractor account (PDA):{" "}
          <span className="font-mono">{contractorPda.toBase58()}</span>
        </p>
      )}

      {(loading || updating) && (
        <p className="text-sm text-slate-400">
          {loading ? "Loading proposals…" : "Updating proposal…"}
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {updateError && <p className="text-sm text-red-400">{updateError}</p>}

      {proposals.length === 0 && !loading && !error && (
        <p className="text-sm text-slate-400">
          You haven't created any proposals yet.
        </p>
      )}

      {proposals.length > 0 && (
        <div className="space-y-3">
          {proposals.map((p: any) => {
            const proposalPk: PublicKey = p.publicKey;
            const proposalPkStr = proposalPk.toBase58();
            const contractPk: PublicKey = p.account.contract;
            const contractPkStr = contractPk.toBase58();

            const contractInfo = contractsByPk[contractPkStr];
            const proposalId = Number(
              p.account.proposalId ?? p.account.proposal_id ?? 0
            );

            const currentAmount = p.account.amount
              ? Number(p.account.amount)
              : null;

            const inputValue = amountInputs[proposalPkStr] ?? "";

            return (
              <div
                key={proposalPkStr}
                className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      Proposal #{proposalId}
                    </p>
                    <p className="text-slate-400">
                      Contract:{" "}
                      {contractInfo?.title ?? "(unknown title)"}
                    </p>
                  </div>
                  <p className="text-emerald-400">
                    {currentAmount !== null
                      ? `${lamportsToSol(currentAmount)} SOL`
                      : "-"}
                  </p>
                </div>

                <p className="text-slate-500 break-all">
                  Proposal PDA:{" "}
                  <span className="font-mono">{proposalPkStr}</span>
                </p>

                <p className="text-slate-500 break-all">
                  Contract address:{" "}
                  <Link
                    href={`/client/contracts/${contractPkStr}`}
                    className="font-mono text-indigo-400 hover:underline"
                  >
                    {contractPkStr}
                  </Link>
                </p>

                <div className="pt-2 border-t border-slate-800 mt-2">
                  <p className="text-[11px] text-slate-400 mb-1">
                    Update proposed amount (in SOL)
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.000000001"
                      className="flex-1 rounded bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                      placeholder="New amount in SOL"
                      value={inputValue}
                      onChange={(e) =>
                        handleAmountChange(proposalPkStr, e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdate(p)}
                      disabled={updating || !inputValue}
                      className="text-[11px] px-3 py-1 rounded bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40"
                    >
                      {updating ? "Updating…" : "Update"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
