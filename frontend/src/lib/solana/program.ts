"use client";

import { useMemo } from "react";
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import idl from "./solance_idl.json";

const PROGRAM_ID_STR =
  process.env.NEXT_PUBLIC_SOLANCE_PROGRAM_ID ||
  (idl as any).address ||
  "9os8f9dUNrZzg53kjGb1wj1stMabFFj4fuRnrF9pCjR6"; 

export const SOLANCE_PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);

export function useSolanceProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    if (!connection) return null;

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      AnchorProvider.defaultOptions()
    );

    return new Program(idl as Idl, provider);
  }, [connection, wallet.publicKey?.toBase58()]);

  return program;
}
