"use client";

import { useCallback, useState } from "react";
import { SystemProgram, PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import { useSolanceProgram } from "@/lib/solana/program";

const CONTRACTOR_SEED = "contractor";
const PROPOSAL_SEED = "proposal";

export function useCreateProposal() {
  const program = useSolanceProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [lastProposalPda, setLastProposalPda] = useState<PublicKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createProposal = useCallback(
    async (contractPk: PublicKey, amountLamports: bigint | number) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);

      try {
        const [contractorPda] = PublicKey.findProgramAddressSync(
          [Buffer.from(CONTRACTOR_SEED), publicKey.toBuffer()],
          program.programId
        );

        const contractorAccount: any = await (program.account as any).contractor.fetch(
          contractorPda
        );

        const nextProposalIdBn = new BN(
          contractorAccount.nextProposalId ??
            contractorAccount.next_proposal_id ??
            0
        );

        const [proposalPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from(PROPOSAL_SEED),
            contractorPda.toBuffer(),
            nextProposalIdBn.toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

        const amountBn =
          typeof amountLamports === "bigint"
            ? new BN(amountLamports.toString())
            : new BN(amountLamports);

        await program.methods
          .initializeProposalIx(amountBn)
          .accounts({
            contractor: publicKey,
            contract: contractPk,
            contractorAccount: contractorPda,
            proposalAccount: proposalPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        setLastProposalPda(proposalPda);
        return { contractorPda, proposalPda, proposalId: nextProposalIdBn };
      } catch (e: any) {
        console.error("initializeProposalIx error:", e);
        setError(e.message ?? "Failed to create proposal");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { createProposal, loading, error, lastProposalPda };
}
