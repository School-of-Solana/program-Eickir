"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

import { useSolanceProgram } from "@/lib/solana/program";
import { useLoadContract } from "@/hooks/useLoadContract";
import { useCreateProposal } from "@/hooks/useCreateProposal";
// import { useUpdateProposal } from "@/hooks/useUpdateProposal"; // à brancher ensuite

const CONTRACTOR_SEED = "contractor";

export default function ContractorAvailableContractPage() {
  const params = useParams();
  const { publicKey, connected } = useWallet();
  const program = useSolanceProgram();

  // 1. Récup de la PK du contrat à partir de l’URL
  const contractPkParam = params?.contractPk as string | undefined;

  const contractPubkey = useMemo(() => {
    try {
      return contractPkParam ? new PublicKey(contractPkParam) : null;
    } catch {
      return null;
    }
  }, [contractPkParam]);

  const {
    data: contractData,
    loading: contractLoading,
    error: contractError,
  } = useLoadContract(contractPubkey);

  // 2. Gestion du ContractorAccount (PDA)
  const [contractorPda, setContractorPda] = useState<PublicKey | null>(null);
  const [hasContractorAccount, setHasContractorAccount] = useState<boolean | null>(null);
  const [contractorCheckError, setContractorCheckError] = useState<string | null>(null);
  const [checkingContractor, setCheckingContractor] = useState(false);

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
        // On tente de fetch le contractor account
        await (program.account as any).contractor.fetch(pda);
        setHasContractorAccount(true);
      } catch (e: any) {
        console.error("Error fetching contractor account:", e);
        // Anchor / RPC renvoie souvent "Account does not exist"
        if (
          e.message?.includes("Account does not exist") ||
          e.message?.includes("could not find account")
        ) {
          setHasContractorAccount(false);
        } else {
          setHasContractorAccount(false);
          setContractorCheckError(e.message ?? "Failed to load contractor account");
        }
      } finally {
        setCheckingContractor(false);
      }
    })();
  }, [program, publicKey]);

  // 3. Hook pour createProposal
  const {
    createProposal,
    loading: creatingProposal,
    error: createProposalError,
    lastProposalPda,
  } = useCreateProposal();

  // 4. Handlers UI
  const [amountInput, setAmountInput] = useState<string>("");

  const handleCreateProposal = async () => {
    if (!contractPubkey) return;
    if (!amountInput) return;

    const lamports = BigInt(amountInput); // tu peux adapter en SOL->lamports si besoin
    await createProposal(contractPubkey, lamports);
  };

  // 5. Différents cas d’affichage

  if (!contractPkParam || !contractPubkey) {
    return (
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">Contract not found</h1>
        <p className="text-sm text-slate-400">
          Invalid or missing contract public key in URL.
        </p>
      </div>
    );
  }

  if (contractLoading) {
    return <p className="text-sm text-slate-400">Loading contract…</p>;
  }

  if (contractError) {
    return (
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">Error loading contract</h1>
        <p className="text-sm text-red-400">{contractError}</p>
      </div>
    );
  }

  if (!contractData) {
    return (
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">No contract data</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Infos contrat */}
      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-2">
        <h1 className="text-xl font-semibold">{contractData.title}</h1>
        <p className="text-sm text-slate-400 whitespace-pre-wrap">
          {contractData.topic}
        </p>

        <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-2">
          <span>
            Status:{" "}
            <span className="font-semibold text-emerald-400">
              {contractData.status?.opened
                ? "Opened"
                : contractData.status?.accepted
                ? "Accepted"
                : contractData.status?.closed
                ? "Closed"
                : "Unknown"}
            </span>
          </span>
          {contractData.amount && (
            <span>
              Amount:{" "}
              <span className="font-semibold">
                {contractData.amount.toString()} lamports
              </span>
            </span>
          )}
        </div>
      </section>

      {/* Bloc contractor / proposal */}
      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-4">
        {!connected && (
          <p className="text-sm text-amber-400">
            Connect your wallet to submit a proposal.
          </p>
        )}

        {connected && checkingContractor && (
          <p className="text-sm text-slate-400">Checking contractor account…</p>
        )}

        {connected && !checkingContractor && hasContractorAccount === false && (
          <div className="space-y-2">
            <p className="text-sm text-amber-400">
              You don&apos;t have a Contractor account yet for this wallet.
            </p>
            <p className="text-xs text-slate-500">
              Go to the <span className="font-semibold">Contractor</span> page to
              initialize your on-chain contractor profile before sending proposals.
            </p>
            {contractorCheckError && (
              <p className="text-xs text-red-400">{contractorCheckError}</p>
            )}
          </div>
        )}

        {connected && !checkingContractor && hasContractorAccount && contractorPda && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Submit / update your proposal</h2>

            {/* ⚠ pour l’instant : version simple = only create.
               Pour gérer l’update, il faudra charger la Proposal existante
               (Proposal filtered par { contract, contractor }) et préremplir le champ. */}
            <div className="space-y-2">
              <label className="block text-xs text-slate-300">
                Amount (lamports)
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
            </div>

            {createProposalError && (
              <p className="text-xs text-red-400">{createProposalError}</p>
            )}

            {lastProposalPda && (
              <p className="text-xs text-emerald-400 break-all">
                Proposal created: {lastProposalPda.toBase58()}
              </p>
            )}

            <button
              type="button"
              disabled={creatingProposal || !amountInput}
              onClick={handleCreateProposal}
              className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-sm font-medium"
            >
              {creatingProposal ? "Submitting…" : "Create proposal"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
