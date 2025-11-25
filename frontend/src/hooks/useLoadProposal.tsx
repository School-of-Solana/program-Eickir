"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useSolanceProgram } from "@/lib/solana/program";

export function useLoadProposals(contractPk: PublicKey | null) {
  const program = useSolanceProgram();
  const [data, setData] = useState<{ pubkey: PublicKey; account: any }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!program || !contractPk) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const proposals = await (program.account as any).proposal.all([
          {
            memcmp: {
              offset: 8,
              bytes: contractPk.toBase58(),
            },
          },
        ]);
        setData(proposals);
      } catch (e: any) {
        console.error("load proposals error:", e);
        setError(e.message ?? "Failed to load proposals");
      } finally {
        setLoading(false);
      }
    })();
  }, [program, contractPk]);

  return { data, loading, error };
}
