"use client";

import { useMemo } from "react";
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import idl from "./solance_idl.json";

export const SOLANCE_PROGRAM_ID = new PublicKey(
  (idl as any).address ?? "4JasCNGt4XMT7hGh86296TQXrvyJYXEhF6R4apdVLyXg"
);

export function useSolanceProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    if (!connection) return null;

    // On n’a pas besoin d’un wallet connecté pour lire,
    // donc si pas de pubkey → on passe un “fake wallet” minimal.
    const provider = new AnchorProvider(
      connection,
      (wallet as any) ?? ({} as any),
      AnchorProvider.defaultOptions()
    );

    return new Program(idl as Idl, provider);
  }, [
    connection,
    // très important : on ne dépend QUE de la pubkey,
    // pas de l’objet wallet entier (qui change souvent de référence)
    wallet.publicKey?.toBase58(),
  ]);

  return program;
}
