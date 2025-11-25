"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanceProgram } from "@/lib/solana/program";

const CLIENT_SEED = "client";
const CONTRACT_SEED = "contract";

export interface ClientContract {
  pda: PublicKey;
  data: any;
  id: number;
}

export function useClientContracts() {
  const program = useSolanceProgram();
  const { publicKey } = useWallet();

  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [clientPda, setClientPda] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!program || !publicKey) {
        setContracts([]);
        setClientPda(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [clientPdaDerived] = PublicKey.findProgramAddressSync(
          [Buffer.from(CLIENT_SEED), publicKey.toBuffer()],
          program.programId
        );
        setClientPda(clientPdaDerived);

        const clientAccount: any = await (program.account as any).client.fetch(
          clientPdaDerived
        );

        const nextId: number =
          clientAccount.nextContractId ??
          clientAccount.next_contract_id ??
          0;

        const results: ClientContract[] = [];

        for (let i = 0; i < nextId; i++) {
          const bnId = new BN(i);
          const [contractPda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from(CONTRACT_SEED),
              clientPdaDerived.toBuffer(),
              bnId.toArrayLike(Buffer, "le", 8),
            ],
            program.programId
          );

          try {
            const contractData = await (program.account as any).contract.fetch(
              contractPda
            );
            results.push({ pda: contractPda, data: contractData, id: i });
          } catch (e) {
            console.warn("Could not fetch contract", i, e);
          }
        }

        setContracts(results);
      } catch (e: any) {
        console.error("Error loading client contracts:", e);
        setError(e.message ?? "Failed to load contracts");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [program, publicKey]);

  return { contracts, clientPda, loading, error };
}
