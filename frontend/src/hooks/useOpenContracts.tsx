"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useSolanceProgram } from "@/lib/solana/program";

export type ContractStatus = "opened" | "accepted" | "closed";

export type OpenContract = {
  pubkey: PublicKey;
  client: string;
  contractor: string | null;
  contractId: number;
  title: string;
  topic: string;
  amount: number | null; // lamports
  status: ContractStatus;
};

export function useOpenContracts() {
  const program = useSolanceProgram();
  const [contracts, setContracts] = useState<OpenContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!program) return;

    const fetchContracts = async () => {
      setLoading(true);
      setError(null);
      try {
        // tous les accounts Contract du program
        const all = await (program.account as any).contract.all();

        const opened = all
          .filter((c: any) => {
            const status = c.account.status;
            return status && "opened" in status;
          })
          .map((c: any) => {
            const acc = c.account;
            const s = acc.status;
            let status: ContractStatus = "opened";
            if ("accepted" in s) status = "accepted";
            if ("closed" in s) status = "closed";

            return {
              pubkey: c.publicKey as PublicKey,
              client: acc.client.toBase58(),
              contractor: acc.contractor ? acc.contractor.toBase58() : null,
              contractId: Number(acc.contractId ?? acc.contract_id ?? 0),
              title: acc.title,
              topic: acc.topic,
              amount: acc.amount ? Number(acc.amount) : null,
              status,
            } as OpenContract;
          });

        setContracts(opened);
      } catch (e: any) {
        console.error("useOpenContracts error:", e);
        setError(e.message ?? "Failed to load contracts");
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [program]);

  return { contracts, loading, error };
}
