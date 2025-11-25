"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useSolanceProgram } from "@/lib/solana/program";

type LoadedProposal = {
  pubkey: PublicKey;
  account: any;
};

export function useContractWithProposals(contractPk: PublicKey | null) {
  const program = useSolanceProgram();

  const [contract, setContract] = useState<any | null>(null);
  const [proposals, setProposals] = useState<LoadedProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!program || !contractPk) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {

        const contractData = await (program.account as any).contract.fetch(
          contractPk
        );
        setContract(contractData);
        const allProposals = await (program.account as any).proposal.all([
          {
            memcmp: {
              offset: 8,
              bytes: contractPk.toBase58(),
            },
          },
        ]);

        const formatted: LoadedProposal[] = allProposals.map(
          (p: { publicKey: PublicKey; account: any }) => ({
            pubkey: p.publicKey,
            account: p.account,
          })
        );

        formatted.sort((a, b) => {
          const idA = Number(a.account.proposalId ?? a.account.proposal_id ?? 0);
          const idB = Number(b.account.proposalId ?? b.account.proposal_id ?? 0);
          return idA - idB;
        });

        setProposals(formatted);
      } catch (e: any) {
        console.error("useContractWithProposals error:", e);
        setError(e.message ?? "Failed to load contract and proposals");
        setContract(null);
        setProposals([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [program, contractPk]);

  return { contract, proposals, loading, error };
}
