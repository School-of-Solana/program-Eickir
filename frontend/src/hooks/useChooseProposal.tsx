"use client";

import { useCallback, useState } from "react";
import { SystemProgram, PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanceProgram } from "@/lib/solana/program";

const CLIENT_SEED = "client";
const VAULT_SEED = "vault";

export function useChooseProposal() {
  const program = useSolanceProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastVaultPda, setLastVaultPda] = useState<PublicKey | null>(null);

  const chooseProposal = useCallback(
    async (
      contractPk: PublicKey,
      proposalPda: PublicKey,
      contractorAccountPk: PublicKey
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);

      try {

        const [clientPda] = PublicKey.findProgramAddressSync(
          [Buffer.from(CLIENT_SEED), publicKey.toBuffer()],
          program.programId
        );


        const [vaultPda] = PublicKey.findProgramAddressSync(
          [Buffer.from(VAULT_SEED), contractPk.toBuffer()],
          program.programId
        );

        await program.methods
          .chooseProposalIx()
          .accounts({
            signer: publicKey,
            clientAccount: clientPda,
            contract: contractPk,
            proposalAccount: proposalPda,
            contractorAccount: contractorAccountPk,
            vault: vaultPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        setLastVaultPda(vaultPda);
        return vaultPda;
      } catch (e: any) {
        console.error("chooseProposalIx error:", e);
        setError(e.message ?? "Failed to choose proposal");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { chooseProposal, loading, error, lastVaultPda };
}
