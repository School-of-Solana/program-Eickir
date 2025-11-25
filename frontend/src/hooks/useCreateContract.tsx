"use client";

import { useCallback, useState } from "react";
import { SystemProgram, PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import { useSolanceProgram } from "@/lib/solana/program";

const CLIENT_SEED = "client";
const CONTRACT_SEED = "contract";

export function useCreateContract() {
  const program = useSolanceProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [lastContractPda, setLastContractPda] = useState<PublicKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createContract = useCallback(
    async (title: string, topic: string) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);

      try {
        const [clientPda] = PublicKey.findProgramAddressSync(
          [Buffer.from(CLIENT_SEED), publicKey.toBuffer()],
          program.programId
        );

        const clientAccount: any = await (program.account as any).client.fetch(clientPda);

        const nextId = new BN(
          clientAccount.nextContractId ??
            clientAccount.next_contract_id ??
            0
        );

        const [contractPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from(CONTRACT_SEED),
            clientPda.toBuffer(),
            nextId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

        await program.methods
          .initializeContractIx(title, topic)
          .accounts({
            signer: publicKey,
            clientAccount: clientPda,
            contractAccount: contractPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        setLastContractPda(contractPda);
        return { clientPda, contractPda, contractId: nextId };
      } catch (e: any) {
        console.error("initializeContractIx error:", e);
        setError(e.message ?? "Failed to create contract");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { createContract, loading, error, lastContractPda };
}
