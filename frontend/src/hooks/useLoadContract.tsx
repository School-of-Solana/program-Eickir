"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useSolanceProgram } from "@/lib/solana/program";

export function useLoadContract(contractPk: PublicKey | null) {
  const program = useSolanceProgram();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!program || !contractPk) {
      return;
    }

    const pkStr = contractPk.toBase58();
    const progId = program.programId.toBase58();

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const contract = await (program.account as any).contract.fetch(contractPk);
        if (!cancelled) {
          setData(contract);
        }
      } catch (e: any) {
        console.error("load contract error:", e);
        if (!cancelled) {
          setError(e.message ?? "Failed to load contract");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    // cleanup au cas où le composant se démonte pendant le fetch
    return () => {
      cancelled = true;
    };
  }, [
    // on ne met pas directement `program` et `contractPk` (objets),
    // mais leurs représentations stables :
    program?.programId.toBase58(),
    contractPk?.toBase58(),
  ]);

  return { data, loading, error };
}
